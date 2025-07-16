const mongodb = require('mongodb')
const moment = require('moment')
const ch = require('./clickhouse').default.ch

const client = mongodb.MongoClient

const queries = [
    `CREATE TABLE IF NOT EXISTS unit (
        _id String,
        parent_id String,
        parent_name String,
        name String
    ) ENGINE=MergeTree()
    PRIMARY KEY _id`,
];
for(const query of queries) {
  //break;
  const stream = ch.query({query: query})
}
client.connect(require('./database'), function(err, client) {
    pcc = client.db('pcc').collection('unit');
    var cursor = pcc.aggregate([
      {
        "$lookup" : {
          "as" : "parent",
          "from" : "unit",
          "localField" : "parent",
          "foreignField" : "_id"
        }
      },
      {
        "$project": {
          "_id": "$_id",
          "name": "$name",
          "parent": {"$arrayElemAt": ["$parent", 0]},
        }
      },
      {
        "$project": {
          "_id": 1,
          "name": 1,
          "parent_id": "$parent._id",
          "parent_name": "$parent.name",
        }
      }
    ])
    const batchSize = 1000;
    let batch = [];
    var i = 0;

    const insertBatch = async () => {
      if (batch.length === 0) {
        return;
      }
      try {
        cursor.pause()
        await ch.insert({
          table: 'unit',
          values: batch,
          format: 'JSONEachRow',
        });
        cursor.resume()
        batch = [];
      } catch (error) {
        console.error('ClickHouse insert error:', error);
      }
    };
    cursor.on('data', async function(doc) {
      i++;
      batch.push(doc);
      if (batch.length >= batchSize) {
        await insertBatch();
      }
      if(i % 1000 == 0) {
        console.log(i)
      }

    });
    cursor.on('end', async function(err) {
      console.log('mongo query end');
      await insertBatch(); // Insert any remaining data
      await ch.query({query: "OPTIMIZE TABLE unit FINAL"});
      await ch.close()
    });
    //cursor.pipe(clickhouseStream)

});

