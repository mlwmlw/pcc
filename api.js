const fs = require('fs');
const express = require('express');
const http = require('http');
const mongodb = require('mongodb');
const q = require('q'); // Kept for now, might be removable if getAll is fully native Promise
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);
// const redis = require('redis'); // Original was commented out
const compression =require('compression');
const _ = require('lodash');
const https = require('https');
const cors = require('cors');
const isbot = require('isbot');
const nodejieba = require("nodejieba");
const { ch } = require('./clickhouse'); // Assuming clickhouse.js exports ch

const corsOptions = {
    origin: 'http://pcc.mlwmlw.org:3000',
    optionsSuccessStatus: 200
};
const qs = require('qs');
const uri = require('./database'); // Assuming database.js exports the URI

const app = express();
app.use(express.static(__dirname + '/public'));
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.set('port', (process.env.PORT || 8888));

// const cache = redis.createClient({url: 'redis://direct.mlwmlw.org'}); // Original was commented out

const client = new mongodb.MongoClient(uri, {
    connectTimeoutMS: 10000,
    serverSelectionTimeoutMS: 120000,
    useUnifiedTopology: true
});

let db;
let pccDataPromise = null; // For caching getAll result

// Wrapper for callback-style MongoDB operations to return Promises
function toPromise(fn) {
    return (...args) => {
        return new Promise((resolve, reject) => {
            fn(...args, (err, result) => {
                if (err) {
                    return reject(err);
                }
                resolve(result);
            });
        });
    };
}

const getAll = () => {
    if (pccDataPromise) {
        return pccDataPromise;
    }
    pccDataPromise = new Promise((resolve, reject) => {
        if (!db) {
            const err = new Error("Database not connected yet for getAll");
            console.error(err);
            pccDataPromise = null; // Allow retry
            return reject(err);
        }
        const collection = db.collection('pcc');
        collection.find({}).sort({ publish: -1 }).toArray((err, docs) => {
            if (err) {
                console.error('Error in getAll:', err);
                pccDataPromise = null; // Allow retry
                return reject(err);
            }
            console.log('data ready all : ');
            resolve(docs);
        });
    });
    return pccDataPromise;
};
async function getUnitsByName(name) {
    const query = `SELECT distinct name FROM unit WHERE _id LIKE '${name}%' OR parent_name LIKE '${name}%' OR parent_id LIKE '${name}%' LIMIT 1000`;
    try {
        const resultSet = await ch.query({
            query: query,
            format: 'JSON'
        });
        const rows = await resultSet.json();
        return rows.data.map(row => row.name.trim())
    } catch (err) {
        console.error("Error in getUnitsByName:", err);
        throw err; // Propagate error
    }
}
async function startServer() {
    try {
        await client.connect();
        console.log("Connected successfully to MongoDB");
        db = client.db('pcc');

        app.use(cors(corsOptions));

        app.use((req, res, next) => {
            res.set('Cache-control', 'public, max-age=3600');
            next();
        });

        app.use(compression());
        
        // Commented out cache middleware from original
        /*
        app.use((req, res, next) => {
            res.setHeader('Content-Type', 'application/json');
            if (/merchants|rank|units|month|categories|units_stats/.test(req.path)) {
                let key = req.path;
                key = key + "?" + qs.stringify(req.query);
                const send = res.send;
                res.send = (result) => {
                    cache.set(key, result);
                    cache.expire(key, 3600 * 24);
                    send.call(res, result);
                };
                cache.get(key, (err, reply) => {
                    if (reply) {
                        res.setHeader('cache', 'HIT');
                        send.call(res, reply);
                    } else {
                        res.setHeader('cache', 'MISS');
                        next();
                    }
                });
            } else {
                next();
            }
        });
        */

        app.get('/page/:page', async (req, res) => {
            try {
                const pcc = await getAll();
                const page = parseInt(req.params.page, 10);
                const perPage = 30;
                res.send(pcc.slice(page * perPage, (page + 1) * perPage));
            } catch (err) {
                console.error("/page/:page error:", err);
                res.status(500).send("Error processing request");
            }
        });

        app.post('/keyword/:keyword', (req, res) => {
            db.collection('search_log').insertOne({
                keyword: req.params.keyword,
                ip: req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
                ua: req.get('User-Agent'),
                ts: new Date()
            }, (err, result) => {
                if (err) {
                    console.log(err);
                }
            });
            res.send(true);
        });

        app.get('/keyword/:keyword', async (req, res) => {
            if (!req.params.keyword) {
                return res.send('failed');
            }
            const tags = nodejieba.cut(req.params.keyword, true).filter(str => str.trim());

            const query = `SELECT job_number, max(name) as name, max(unit) as unit, max(unit_id) as unit_id, toDate(min(publish)) as publish, max(merchants) as merchants 
                           FROM pcc 
                           WHERE NOT(has(multiSearchAllPositionsCaseInsensitiveUTF8(concat(pcc.name, ' ', pcc.unit, ' ', arrayStringConcat(pcc.merchants)), ['${tags.join("','")}']), 0)) 
                           GROUP BY job_number 
                           ORDER BY publish DESC 
                           LIMIT 1000`;
            
            try {
                const resultSet = await ch.query({
                    query: query,
                    format: 'JSON'
                });
                const rows = await resultSet.json();
                db.collection('search_result').insertOne({
                    keyword: req.params.keyword,
                    ip: req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
                    ua: req.get('User-Agent'),
                    tags: tags,
                    count: rows.length,
                    ts: new Date()
                });
                res.send(rows.data);
            } catch (err) {
                console.error("Clickhouse query error in /keyword/:keyword", err);
                res.status(500).send("Error processing request");
            }
        });

        app.get('/keywords', (req, res) => {
            db.collection('search_log').aggregate([
                { $match: { ts: { $gt: dayjs().subtract(7, 'day').toDate() }, keyword: { $ne: "undefined" } } },
                { $group: { _id: "$keyword", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 30 },
                { $lookup: {
                    as: 'result',
                    from: 'search_result',
                    let: { keyword: "$_id" },
                    pipeline: [
                        { $match: {
                            ts: { $gt: dayjs().subtract(7, 'day').toDate() },
                            $expr: { $eq: ["$keyword", "$$keyword"] }
                        }},
                        { $group: { _id: "$$keyword", result: { $max: "$count" } } }
                    ]
                }},
                { $project: { count: 1, result: { $arrayElemAt: ["$result", 0] } } },
                { $project: { count: 1, result: "$result.result" } },
                { $match: { $or: [{ result: { $gt: 0 } }, { result: { $exists: false } }] } },
                { $sample: { size: 15 } }
            ]).toArray((err, docs) => {
                if (err) {
                    console.error("/keywords error:", err);
                    return res.status(500).send("Error processing request");
                }
                res.send(_.map(docs, '_id'));
            });
        });

        app.get('/date/:type/:date', (req, res) => {
            // 將輸入日期（台北時間）轉為 UTC+0 的同一天 00:00:00
            const taipeiDate = dayjs.tz(req.params.date, 'Asia/Taipei').startOf('day');
            const startDate = dayjs(taipeiDate).utc().toDate();
            const tomorrow = new Date(req.params.date);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const collectionName = req.params.type === 'tender' ? 'pcc' : 'award';
            const filter = req.params.type === 'tender' 
                ? { publish: { $gte: startDate, $lt: tomorrow } } 
                : { end_date: { $gte: startDate, $lt: tomorrow } };
            db.collection(collectionName).find(filter).toArray((err, docs) => {
                if (err) {
                    console.error("/date/:type/:date error:", err);
                    return res.status(500).send("Error processing request");
                }
                res.send(docs);
            });
        });
        
        app.get('/month', async (req, res) => {
            try {
                const resultSet = await ch.query({
                    query: "SELECT toYear(publish) as year, toMonth(publish) as month FROM pcc GROUP BY 1, 2 ORDER BY year DESC, month DESC",
                    format: 'JSON'
                });
                const rows = await resultSet.json();
                rows.data.forEach((row) => {
                    row.name = `${row.year} 年 ${row.month} 月`;
                });
                res.send(rows.data);
            } catch (err) {
                console.error("Clickhouse query error in /month", err);
                res.status(500).send("Error processing request");
            }
        });

        app.get('/dates', async (req, res) => {
            let start = dayjs().subtract(365 * 2, 'day').toDate();
            let end = dayjs("20300101 00:00:00", 'YYYYMMDD HH:mm:ss').toDate();
            const year = req.query.year;
            let month = req.query.month;

            if (month && parseInt(month, 10) < 10) {
                month = '0' + month;
            }
            if (year && month) {
                start = dayjs(`${year}${month}01 00:00:00`, 'YYYYMMDD HH:mm:ss').toDate();
                end = dayjs(`${year}${month}01`, 'YYYYMMDD HH:mm:ss').add(1, 'month').toDate();
            } else if (year) {
                start = dayjs(`${year}0101 00:00:00`, 'YYYYMMDD HH:mm:ss').toDate();
                end = dayjs(`${year}1231 23:59:59`, 'YYYYMMDD HH:mm:ss').toDate();
            }
            
            const query = `SELECT formatDateTime(publish, '%Y-%m-%d') as date, count(distinct _id) as count 
                           FROM pcc 
                           WHERE publish >= '${start.toISOString().slice(0, 10)}' AND publish < '${end.toISOString().slice(0, 10)}'
                           GROUP BY 1 
                           ORDER BY date DESC`;
            try {
                const resultSet = await ch.query({
                    query: query,
                    format: 'JSON'
                });
                const rows = await resultSet.json();
                res.send(rows.data);
            } catch (err) {
                console.error("Clickhouse query error in /dates", err);
                res.status(500).send("Error processing request");
            }
        });

        app.get('/categories', (req, res) => {
            db.collection('pcc').aggregate([{ $group: { _id: '$category' } }]).toArray((err, docs) => {
                if (err) {
                    console.error("/categories error:", err);
                    return res.status(500).send("Error processing request");
                }
                res.send(_.map(docs, '_id'));
            });
        });

        app.get('/category/:category', (req, res) => {
            db.collection('pcc').find({ category: req.params.category }).limit(200).toArray((err, docs) => {
                if (err) {
                    console.error("/category/:category error:", err);
                    return res.status(500).send("Error processing request");
                }
                res.send(docs);
            });
        });

        app.get('/rank/merchants/:order?/:year?', async (req, res) => {
            try {
                const year = parseInt(req.params.year, 10);
                const start = new Date(year, 0, 1);
                const end = new Date(year, 11, 31);
                const sortOrder = {};
                sortOrder[req.params.order || "sum"] = -1;
                
                const matchCriteria = { "award.merchants._id": { $ne: "" } };
                if (year) { // Only apply date filter if year is provided and valid
                    matchCriteria.publish = { $gte: start, $lte: end };
                }

                const merchants = await db.collection('pcc').aggregate([
                    { $unwind: "$award.merchants" },
                    { $match: matchCriteria },
                    { $group: { _id: { $ifNull: ["$award.merchants._id", "$award.merchants.name"] }, merchants: { $addToSet: "$award.merchants" }, count: { $sum: 1 }, sum: { $sum: "$award.merchants.amount" } } },
                    { $sort: sortOrder },
                    { $limit: 100 }
                ], { allowDiskUse: true }).toArray();
                
                for (const m of merchants) {
                    m.merchant = m.merchants.pop();
                    delete m.merchants;
                }
                res.send(merchants);
            } catch (err) {
                console.error("/rank/merchants error:", err);
                res.status(500).send("Error processing request");
            }
        });

        app.get('/tree', async (req, res) => {
            try {
                const units = await db.collection('unit').find({}).toArray();
                const tree = { name: "root", children: [] };
                const unitMap = {};

                for (const u of units) {
                    u.children = [];
                    unitMap[u._id] = u;
                }

                for (const u of units) {
                    if (u.parent && unitMap[u.parent]) {
                        unitMap[u.parent].children.push(u);
                    } else if (!u.parent) {
                        tree.children.push(u);
                    }
                }
                // Simplified tree structure as in original, might need deeper nesting if original logic was more complex
                const resultTree = {
                    name: "root",
                    children: tree.children.map(u => ({
                        name: u.name,
                        children: u.children.map(s => ({ name: s.name, children: null })) // Original only went one level deep for root children
                    }))
                };
                res.send(resultTree); // Or send `tree` if full nesting is desired and handled by client
            } catch (err) {
                console.error("/tree error:", err);
                res.status(500).send("Error processing request");
            }
        });
        
        app.get('/merchant_type/:id?', async (req, res) => {
            try {
                const id = req.params.id;
                if (id) {
                    const merchants = await db.collection('merchants').find({ types: { $elemMatch: { id: id } } }, { projection: { name: 1, address: 1, phone: 1, org: 1, _id: 1 } }).toArray();
                    res.send(merchants);
                } else {
                    const types = await db.collection('merchant_type').find({ count: { $gt: 1 } }).toArray();
                    res.send(types);
                }
            } catch (err) {
                console.error("/merchant_type/:id? error:", err);
                res.status(500).send("Error processing request");
            }
        });

        app.get('/merchants_count', async (req, res) => {
            try {
                const count = await db.collection('merchants').countDocuments();
                res.send({ count: count });
            } catch (err) {
                console.error("/merchants_count error:", err);
                res.status(500).send("Error processing request");
            }
        });
        
        app.get('/merchants/:id?', async (req, res) => {
            try {
                const id = req.params.id;
                const queryParams = req.query.filter ? JSON.parse(req.query.filter) : [];
                let filter = { name: { $exists: true } };

                if (id) {
                    if (/\d+/.test(id)) {
                        filter = { _id: id };
                    } else {
                        filter = { name: id };
                    }
                }
                
                for (const item of queryParams) {
                    filter[item.id] = new RegExp(item.value);
                }

                if (req.query.count) {
                    const count = await db.collection('merchants').countDocuments({ name: { $exists: true } });
                    return res.send(String(count));
                } else {
                    let page = parseInt(req.query.page, 10) || 1;
                    page--; // 0-indexed
                    const merchants = await db.collection('merchants')
                        .find(filter, { projection: { name: 1, address: 1, phone: 1, org: 1, _id: 1 } })
                        .limit(100)
                        .skip(page * 100)
                        .toArray();
                    
                    if (id && merchants.length > 0) { // If ID was provided, send the first match (or specific item)
                        res.send(merchants[0]);
                    } else if (id && merchants.length === 0) { // ID provided but no match
                        res.send({});
                    }
                    else { // No ID or ID was for a list (though filter structure implies ID is for single)
                        res.send(merchants);
                    }
                }
            } catch (err) {
                console.error("/merchants/:id? error:", err);
                res.status(500).send("Error processing request");
            }
        });

        app.get('/merchant/:id?', async (req, res) => {
            try {
                const id = req.params.id;
                if (!id) {
                    return res.send({});
                }

                let filter = /\d+/.test(id) ? { "_id": id } : { "name": id };
                let results = await db.collection('merchants').find(filter).sort({ _id: -1 }).toArray();
                let result = results.pop() || {};

                let tenderFilter = /\d+/.test(id) ? { "award.merchants._id": id } : { "award.merchants.name": id };
                let docs = await db.collection('pcc').aggregate([
                    { $match: tenderFilter },
                    { $lookup: { as: '_unit', from: 'unit', localField: "unit_id", foreignField: "_id" } },
                    { $lookup: { as: '_parent', from: 'unit', localField: "_unit.parent", foreignField: "_id" } },
                    { $lookup: { as: '_root', from: 'unit', localField: "_parent.parent", foreignField: "_id" } },
                    { $addFields: {
                        parent_unit: {
                            $cond: [ { $gt: [ { $size: "$_root" }, 0 ] }, "$_root",
                                { $cond: [ { $gt: [ { $size: "$_parent" }, 0 ] }, "$_parent", "$_unit" ] }
                            ]
                        }
                    }},
                    { $unwind: "$parent_unit" },
                    { $project: { _unit: 0, _root: 0, _parent: 0 } }
                ]).toArray();

                docs = _(docs).groupBy('name')
                    .map((vals, key) => _.assign(vals[0], { publish: _.min(vals.map(val => val.publish)) }))
                    .value();
                docs.sort((a, b) => new Date(b.publish) - new Date(a.publish));
                result.tenders = docs;
                res.send(result);
            } catch (err) {
                console.error("/merchant/:id? error:", err);
                res.status(500).send("Error processing request");
            }
        });

        app.get('/tender/:id/:unit?', async (req, res) => {
            try {
                const id = req.params.id;
                const unit = req.params.unit;
                if (!id) {
                    return res.send({});
                }
                const filter = { id: id }; // Assuming 'id' field in pcc collection, not job_number
                                          // Original LS: filter = {id: id}
                                          // If it's job_number, it should be {job_number: id}
                if (unit) {
                    filter['$or'] = [{ unit: new RegExp(unit.replace(/\s+/g, '')) }, { unit_id: unit }];
                }
                
                let tenders = await db.collection('pcc').find(filter).sort({ publish: -1 }).toArray();
                for (const value of tenders) {
                    const namePart = value.name || "";
                    const unitPart = value.unit || "";
                    const merchantNamePart = (value.award && value.award.merchants && value.award.merchants.length > 0) ? (value.award.merchants[0].name || "") : "";

                    value.tags = _.union(
                        nodejieba.cutForSearch(namePart),
                        nodejieba.cutForSearch(unitPart),
                        nodejieba.cutForSearch(merchantNamePart)
                    );
                    value.tags = _.filter(value.tags, word => word.length > 1);
                }
                res.send(tenders);
            } catch (err) {
                console.error("/tender/:id/:unit? error:", err);
                res.status(500).send("Error processing request");
            }
        });
        
        app.get('/rank/tender/:month?', async (req, res) => {
            try {
                const m = req.params.month;
                const start = dayjs(m).startOf('month').toDate();
                const end = dayjs(m).endOf('month').toDate();
                let tenders = await db.collection('pcc')
                    .find({ publish: { $gte: start, $lte: end } })
                    .sort({ price: -1 })
                    .limit(100)
                    .toArray();
                
                // Original LiveScript re-keys and sorts. This might be redundant if sort({price: -1}) is sufficient.
                // tenders = _.keyBy(tenders, 'id'); // 'id' or 'job_number'?
                // tenders = _.toArray(tenders);
                // tenders.sort((a, b) => b.price - a.price); // Already sorted by DB
                res.send(tenders);
            } catch (err) {
                console.error("/rank/tender/:month? error:", err);
                res.status(500).send("Error processing request");
            }
        });

        app.get('/partner/:year?', async (req, res) => {
            try {
                const year = parseInt(req.params.year, 10);
                const start = new Date(year, 0, 1);
                const end = new Date(year, 11, 31);
                const matchCriteria = { merchants: { $exists: true } };
                if (year) { // Only apply date filter if year is provided and valid
                    matchCriteria.end_date = { $gte: start, $lte: end };
                }

                const docs = await db.collection('award').aggregate([
                    { $match: matchCriteria },
                    { $unwind: "$merchants" },
                    { $group: { _id: { unit: "$unit", merchant: "$merchants.name", merchant_id: "$merchants._id" }, price: { $sum: { $add: ["$merchants.amount", { $ifNull: ["$price", 0] }] } }, count: { $sum: 1 } } },
                    { $sort: { count: -1 } }, // Original LS had price: -1, then count: -1. Assuming count is primary sort.
                    { $limit: 50 },
                    { $project: { unit: "$_id.unit", merchant: { _id: "$_id.merchant_id", name: "$_id.merchant" }, price: "$price", count: "$count" } }
                ]).toArray();
                res.send(docs);
            } catch (err) {
                console.error("/partner/:year? error:", err);
                res.status(500).send("Error processing request");
            }
        });
        
        app.get('/unit_info/:id?', async (req, res) => {
            try {
                const unitParam = req.params.id.replace(/\s+/g, '');
                const results = await db.collection('unit').aggregate([
                    { $match: { $or: [{ name: unitParam }, { _id: unitParam }] } },
                    { $lookup: { as: 'parent_docs', from: 'unit', localField: "parent", foreignField: "_id" } }, // Renamed to avoid conflict
                    { $lookup: { as: 'childs', from: 'unit', localField: "_id", foreignField: "parent" } }
                ]).toArray();

                if (results.length > 0) {
                    const doc = results[0];
                    if (doc.parent_docs && doc.parent_docs.length > 0) {
                        doc.parent = doc.parent_docs[0]; // Assign the actual parent object
                    } else {
                        doc.parent = null; // Or {} depending on desired structure if no parent
                    }
                    delete doc.parent_docs; // Clean up
                    res.send(doc);
                } else {
                    res.send({});
                }
            } catch (err) {
                console.error("/unit_info/:id? error:", err);
                res.status(500).send("Error processing request");
            }
        });

        app.get('/units/:id?', async (req, res) => {
            try {
                if (req.params.id === 'all') {
                    const docs = await db.collection('pcc').aggregate([{ $group: { _id: '$unit' } }]).toArray();
                    let units = _.map(docs, '_id');
                    units = units.filter(v => v); // Remove null/undefined
                    units = units.map(row => row.trim());
                    units = units.filter((v, i, a) => a.indexOf(v) === i); // Unique
                    units.sort();
                    res.send(units);
                } else {
                    const parent = req.params.id;
                    const units = await db.collection('unit').aggregate([
                        { $match: { $and: [{ parent: parent }, { parent: { $exists: true } }] } },
                        { $lookup: {
                        as: 'child_counts', // Renamed
                        from: 'unit',
                        let: { unit_id: "$_id" }, // Renamed
                            pipeline: [
                                { $match: { $expr: { $eq: ["$parent", "$$unit_id"] } } },
                                { $group: { _id: null, count: { $sum: 1 } } } // Group by null for total count
                            ]
                        }},
                        { $lookup: { from: 'unit', localField: 'parent', foreignField: '_id', as: 'parents' } },
                        { $lookup: {
                            as: 'tender_counts', // Renamed
                            from: 'pcc',
                            let: { unit_name: "$name" }, // Renamed
                            pipeline: [
                                { $match: { $expr: { $eq: ["$unit", "$$unit_name"] } } },
                                { $group: { _id: "$job_number" } }, // Count distinct job_numbers
                                { $group: { _id: null, count: { $sum: 1 } } } // Then sum up
                            ]
                        }},
                        { $project: {
                            _id: 1,
                            parent_name: { $arrayElemAt: ["$parents.name", 0] },
                            parent: 1,
                            name: 1,
                            childs: { $ifNull: [{ $arrayElemAt: ["$child_counts.count", 0] }, 0] }, // Extract count
                            tenders: { $ifNull: [{ $arrayElemAt: ["$tender_counts.count", 0] }, 0] } // Extract count
                        }}
                    ]).toArray();
                    units.sort((a, b) => String(a._id).replace('.', '') - String(b._id).replace('.', ''));
                    res.send(units);
                }
            } catch (err) {
                console.error("/units/:id? error:", err);
                res.status(500).send("Error processing request");
            }
        });

        app.get('/unit/:unit/:month?', async (req, res) => {
            const unitParam = req.params.unit.replace(/\s+/g, '');
            const filter = {};
            if (req.params.month) {
                const start = new Date(req.params.month + "-01");
                const end = new Date(req.params.month + "-01");
                end.setMonth(end.getMonth() + 1);
                filter.publish = { $gte: start, $lt: end };
            }
            try {      
                const units = await getUnitsByName(unitParam);
                const unitsToQuery = [unitParam].concat(units);
                filter.unit = { $in: _.uniq(unitsToQuery) }; // Ensure uniqueness
                let docs = await db.collection('pcc').find(filter).sort({ publish: -1 }).limit(2000).toArray();
                docs = _(docs).groupBy('job_number')
                    .map((vals, key) => _.assign(vals[0], { publish: _.min(vals.map(val => val.publish)) }))
                    .value();
                docs.sort((a, b) => new Date(b.publish) - new Date(a.publish));
                res.send(docs);
            } catch (dbErr) {
                console.error("/unit/:unit/:month? MongoDB query error:", dbErr);
                res.status(500).send("Error processing request");
            }

        });
        
        app.get('/lookalike/:merchant', async (req, res) => {
            try {
                const docs = await db.collection('pcc').aggregate([
                    { $match: { "award.candidates._id": req.params.merchant } },
                    { $project: { candidates: "$award.candidates" } },
                    { $unwind: "$candidates" },
                    { $group: { _id: "$candidates._id", name: { $max: "$candidates.name" }, count: { $sum: 1 } } },
                    { $match: { "_id": { $ne: req.params.merchant } } },
                    { $sort: { count: -1 } },
                    { $limit: 30 }
                ]).toArray();
                res.send(docs);
            } catch (err) {
                console.error("/lookalike/:merchant error:", err);
                res.status(500).send("Error processing request");
            }
        });

        app.get('/unit_lookalike/:unit', async (req, res) => {
            try {
                const docs = await db.collection('pcc').aggregate([
                    { $match: { "unit": req.params.unit, publish: { $gt: dayjs().subtract(1, 'month').toDate() } } },
                    { $project: { candidates: "$award.candidates" } },
                    { $unwind: "$candidates" },
                    { $group: { _id: "$candidates._id", count: { $sum: 1 } } },
                    { $sort: { count: -1 } },
                    { $lookup: { as: 'pcc_docs', from: 'pcc', localField: "_id", foreignField: "award.candidates._id" } }, // Renamed
                    { $unwind: "$pcc_docs" },
                    { $group: { _id: "$pcc_docs.unit", count: { $sum: 1 } } },
                    { $match: { "_id": { $ne: req.params.unit } } },
                    { $sort: { count: -1 } },
                    { $limit: 10 }
                ], { maxTimeMS: 2000 }).toArray();
                res.send(docs);
            } catch (err) {
                console.error("/unit_lookalike/:unit error:", err);
                // Original sends empty array on error, which might hide issues.
                // Consider sending 500 or specific error. For now, matching original.
                res.send([]);
            }
        });

        app.get('/units_stats/:start/:end?', async (req, res) => {
            try {
                let filter;
                if (req.params.end) {
                    filter = { _id: { "$gte": req.params.start, "$lte": req.params.end } };
                } else {
                    filter = { _id: req.params.start };
                }
                const data = await db.collection('report').find(filter).toArray();
                if (data.length === 1 && !req.params.end) { // If only start was given and one result
                    res.send(data[0].res);
                } else { // Multiple results or range query
                    const result = {};
                    for (const value of data) {
                        result[value._id] = value.res;
                    }
                    res.send(result);
                }
            } catch (err) {
                console.error("/units_stats error:", err);
                res.status(500).send("Error processing request");
            }
        });

        app.get('/election', async (req, res) => {
            try {
                const filter = { unique_id: { "$gt": 0 } };
                const data = await db.collection('election').find(filter).sort({ expense: -1 }).toArray();
                res.send(data);
            } catch (err) {
                console.error("/election error:", err);
                res.status(500).send("Error processing request");
            }
        });
        
        // Original /units_stats/:date?/:days? was commented out, so omitting.
        // Original /units_count used mapReduce. Modern MongoDB prefers aggregation framework.
        // For simplicity, I'll translate mapReduce directly.
        app.get('/units_count', (req, res) => {
            const mapper = function() { emit(this.parent, { count: 1, unit: this.name }); };
            const reducer = function(key, values) {
                let count = 0;
                // let unitName = values.length > 0 ? values[0].unit : null; // Get unit from first element
                for (const value of values) {
                    count += value.count;
                    // unitName = value.unit; // This would take the last unit name
                }
                // The original reducer's `unit: value.unit` is problematic as `value` is from loop scope.
                // Assuming it means the key (parent) or some representative unit.
                // For direct translation, let's assume it intended the key or a fixed value.
                // If `key` is the parent ID, and we need parent name, it's more complex.
                // Sticking to a direct translation of structure:
                return { count: count, unit: key }; // Using key as unit identifier
            };

            db.collection('unit').mapReduce(
                mapper,
                reducer,
                { query: {}, out: { inline: 1 } },
                (err, result) => {
                    if (err) {
                        console.error("/units_count mapReduce error:", err);
                        return res.status(500).send("Error processing request");
                    }
                    res.send(result);
                }
            );
        });

        app.get('/month/:month', (req, res) => {
            const start = new Date(req.params.month + "-01");
            const end = new Date(req.params.month + "-01");
            end.setMonth(end.getMonth() + 1);

            const mapper = function() { emit(this.unit, this.price); };
            const reducer = function(key, values) {
                let sum = 0;
                for (const value of values) {
                    sum += +value;
                }
                return sum;
            };
            
            db.collection('pcc').mapReduce(
                mapper,
                reducer,
                { query: { end_date: { $gte: start, $lt: end } }, out: { inline: 1 } }, // Original used end_date
                (err, result) => {
                    if (err) {
                        console.error("/month/:month mapReduce error:", err);
                        return res.status(500).send("Error processing request");
                    }
                    res.send(result);
                }
            );
        });

        app.get('/news', (req, res) => {
            fs.readFile('./web/views/news.md', 'utf8', (err, data) => {
                if (err) {
                    console.error("Error reading news.md:", err);
                    return res.status(500).send("Could not read news file.");
                }
                const ghReq = https.request({
                    host: 'api.github.com',
                    path: '/markdown',
                    method: 'POST',
                    headers: {
                        'User-Agent': 'Node.js HTTP Client', // Updated User-Agent
                        'Content-Type': 'application/json',
                        'Accept': 'application/vnd.github.v3+json' // Good practice for GH API
                    }
                }, (socket) => {
                    let html = [];
                    socket.on('data', (chunk) => {
                        html.push(chunk);
                    });
                    socket.on('end', () => {
                        res.send(Buffer.concat(html).toString('utf8'));
                    });
                    socket.on('error', (e) => {
                        console.error("GitHub API request error:", e);
                        res.status(500).send("Error fetching markdown from GitHub.");
                    });
                });

                ghReq.on('error', (e) => {
                    console.error("GitHub API request setup error:", e);
                    res.status(500).send("Error setting up request to GitHub.");
                });

                ghReq.write(JSON.stringify({ text: data }));
                ghReq.end();
            });
        });

        app.post('/pageview/:type/:key', (req, res) => {
            if (isbot(req.get('user-agent'))) {
                return res.send(true);
            }
            db.collection('pageview').insertOne({
                type: req.params.type,
                id: req.params.key,
                ip: req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
                ua: req.get('User-Agent'),
                ts: new Date()
            }, (err, result) => {
                if (err) {
                    console.log("/pageview insert error:", err);
                }
            });
            res.send(true);
        });

        app.get('/hot/tenders', async (req, res) => {
            try {
                const docs = await db.collection('pageview').aggregate([
                    { $match: { type: "tender", ts: { $gt: dayjs().subtract(1, 'day').toDate() } } },
                    { $group: { _id: { id: "$id", ip: "$ip" }, count: { $sum: 1 } } }, // Count unique IPs per tender
                    { $group: { _id: "$_id.id", count: { $sum: 1 } } }, // Sum up unique IPs
                    { $sort: { count: -1 } },
                    { $limit: 20 }, // Limit before lookup for performance
                    { $lookup: { as: 'tender', from: 'pcc', localField: "_id", foreignField: "_id" } }, // Assuming _id in pcc is the tender ID
                    { $unwind: "$tender" },
                    { $project: { _id: 1, name: "$tender.name", count: 1, unit: "$tender.unit", job_number: "$tender.job_number" } },
                    // { $sample: { size: 10 } } // Sample after limit might not be what's intended. Usually sample from a larger set.
                ]).toArray();
                 // If sampling is desired from the top 20, apply it here:
                const sampledDocs = docs.length > 10 ? _.sampleSize(docs, 10) : docs;
                res.send(sampledDocs);
            } catch (err) {
                console.error("/hot/tenders error:", err);
                res.status(500).send("Error processing request");
            }
        });

        app.get('/hot/unit', async (req, res) => {
            try {
                const docs = await db.collection('pageview').aggregate([
                    { $match: { type: "unit", ts: { $gt: dayjs().subtract(1, 'day').toDate() } } },
                    { $group: { _id: { id: "$id", ip: "$ip" }, count: { $sum: 1 } } },
                    { $group: { _id: "$_id.id", count: { $sum: 1 } } },
                    { $sort: { count: -1 } },
                    { $limit: 15 },
                    { $lookup: { as: 'unit_doc', from: 'unit', localField: "_id", foreignField: "_id" } }, // Renamed
                    { $unwind: "$unit_doc" },
                    { $project: { _id: 1, name: "$unit_doc.name", count: 1 /*, unit: "$unit_doc._id"*/ } }, // unit field was redundant
                    // { $sample: { size: 10 } }
                ]).toArray();
                const sampledDocs = docs.length > 10 ? _.sampleSize(docs, 10) : docs;
                res.send(sampledDocs);
            } catch (err) {
                console.error("/hot/unit error:", err);
                res.status(500).send("Error processing request");
            }
        });

        app.get('/hot/merchant', async (req, res) => {
            try {
                const docs = await db.collection('pageview').aggregate([
                    { $match: { type: "merchant", ts: { $gt: dayjs().subtract(1, 'day').toDate() } } },
                    { $group: { _id: { id: "$id", ip: "$ip" }, count: { $sum: 1 } } },
                    { $group: { _id: "$_id.id", count: { $sum: 1 } } },
                    { $sort: { count: -1 } },
                    { $limit: 15 },
                    { $lookup: { as: 'merchant_doc', from: 'merchants', localField: "_id", foreignField: "_id" } }, // Renamed
                    { $unwind: "$merchant_doc" },
                    { $project: { _id: 1, name: "$merchant_doc.name", count: 1 , merchant: "$merchant_doc._id" } },
                    // { $sample: { size: 10 } }
                ]).toArray();
                const sampledDocs = docs.length > 10 ? _.sampleSize(docs, 10) : docs;
                res.send(sampledDocs);
            } catch (err) {
                console.error("/hot/merchant error:", err);
                res.status(500).send("Error processing request");
            }
        });

        http.createServer(app).listen(app.get('port'), () => {
            console.log('Express server listening on port ' + app.get('port'));
        });

    } catch (err) {
        console.error("Failed to connect to MongoDB or start server", err);
        process.exit(1);
    }
}

startServer();

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err.stack);
    // Consider a more graceful shutdown or logging to an external service
});
