var mongodb = require('mongodb')
var dayjs = require('dayjs')
var q = require('q');
var _ = require('lodash')
uri = require('./database');
const client = new mongodb.MongoClient(uri, {
    connectTimeoutMS: 10000,
    serverSelectionTimeoutMS: 120000,
    useUnifiedTopology: true
});
(async function main() {

    await client.connect();
    const db = client.db('pcc');

    var merchants_collection = db.collection('merchants');
    var pcc_collection = db.collection('pcc');
    var merchants = await pcc_collection.aggregate([
        { $match: { "award.candidates.0": { $exists: 1 } } },
        { $sort: { publish: -1 } },

        { $project: { merchants: "$award.candidates", publish: 1 } },
        { $unwind: "$merchants" },
        { $project: { merchants: 1 } },
        
					// { $match: { 'merchants._id': { $nin: ids } } }
        // {$group: {_id: "$merchants._id"}},
        {$skip: 400000},
        {$limit : 100000},
        
    ], { allowDiskUse: true }).toArray();
    var i = 0;
    var promises = merchants.map(async function(merchant) {
        const m = await merchants_collection.find({_id: merchant.merchants._id}, { _id: 1 }).toArray();
        i++;
        if(i % 100 == 0) {
            console.log('processing', i, 'merchants')
        }
        if(m.length == 0) {
            console.log('insert', merchant.merchants._id)
            var insert_merchant = merchant.merchants;
            delete insert_merchant.amount
            delete insert_merchant.awarding
            console.log('insert_merchant', insert_merchant)
            return await merchants_collection.insertOne(merchant.merchants);
        } else {
            // console.log('exists', merchant.merchants._id)
            return m;
        }
        
            // var insert = _.map(rows, 'merchants')
            // if (insert.length == 0) {
            //     db.close();
            //     return;
            // }
            // var batch = merchants.initializeOrderedBulkOp();
            // for (var i in insert) {
            //     delete insert[i].amount
            //     delete insert[i].awarding
            //     batch.insert(insert[i]);
            // }
            // batch.execute(function(err, result) {
            //     if (err)
            //         console.dir(err);
            //     console.dir(result);
            //     db.close();
            // });
    })
    Promise.all(promises).then(function() {
        console.log('all done')
        client.close();
    }).catch(function(err) {
        console.error('Error processing merchants:', err);
    });
    
    
})()
/*
db.getCollection('award').aggregate([
{$match: {"merchants.0": {$exists: 1}}}, 
{$project: {merchants: 1, publish: 1}},
{$unwind: "$merchants"},
{$sort: {publish: -1}},
{$project: {merchants: 1}},
{
   $lookup:
     {
       from: "merchants",
       localField: "merchants._id",
       foreignField: "_id",
       as: "join_merchants"
     }
},
{$match: {"join_merchants._id": {$exists: 0}}}
//{$group: {_id: "$merchants._id"}},

//{$group: {_id: 1, count: {$sum: 1}}}
], {allowDiskUse: true})*/
