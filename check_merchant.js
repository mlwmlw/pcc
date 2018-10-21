var mongodb = require('mongodb')
var moment = require('moment')
var q = require('q');
var _ = require('lodash')
uri = require('./database');
client = mongodb.MongoClient
i = 0;

client.connect(uri, function(err, db) {
    var merchants = db.collection('merchants');
    merchants.find({}, { _id: 1 }).toArray(function(err, ms) {
        var ids = _.map(ms, '_id')
        var award = db.collection('award');
        award.aggregate([
            { $match: { "merchants.0": { $exists: 1 } } },
            { $project: { merchants: 1, publish: 1 } },
            { $unwind: "$merchants" },
            { $sort: { publish: -1 } },
            { $project: { merchants: 1 } },
            { $match: { 'merchants._id': { $nin: ids } } }
            //{$group: {_id: "$merchants._id"}},
        ], { allowDiskUse: true }).toArray(function(err, rows) {

            var insert = _.map(rows, 'merchants')
            if (insert.length == 0) {
                db.close();
                return;
            }
            var batch = merchants.initializeOrderedBulkOp();
            for (var i in insert) {
                delete insert[i].amount
                delete insert[i].awarding
                batch.insert(insert[i]);
            }
            batch.execute(function(err, result) {
                if (err)
                    console.dir(err);
                console.dir(result);
                db.close();
            });

        })

    });
})

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