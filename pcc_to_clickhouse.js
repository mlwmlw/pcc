const mongodb = require('mongodb')
const moment = require('moment')
const ch = require('./clickhouse').default.ch
const client = mongodb.MongoClient

const queries = [
    `CREATE TABLE IF NOT EXISTS pcc (
        _id String,
        publish DateTime,
        unit String,
        unit_id String,
        name String,
        job_number String,
        merchants Array(String),
        _version DateTime
    ) ENGINE=ReplacingMergeTree(_version)
    PARTITION BY toYYYYMM(publish)
    ORDER BY (_id, publish)
    PRIMARY KEY _id`,
];
for(const query of queries) {
  ch.query({query: query})
}
var skip = 1927000;
//skip = 0;
client.connect(require('./database'), function(err, client) {
    pcc = client.db('pcc').collection('pcc');
    var cursor = pcc.find({
    }, {projection: {_id: 1, name: 1, job_number: 1,unit: 1, unit_id: 1, publish: 1, end_date: 1, 'award.name': 1, 'award.unit': 1, 'award.merchants.name': 1}}).skip(skip)
    const batchSize = 10000;
    let batch = [];
    var i = 0;
    const insertBatch = async () => {
      if (batch.length === 0) {
        return;
      }
      try {
        cursor.pause()
        await ch.insert({
          table: 'pcc',
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
      doc._id = doc.job_number;
      doc.name = doc.name || (doc.award && doc.award.name);
      if(!doc.name) {
        return
      }
      doc.publish = moment(doc.publish || doc.end_date).format('YYYY-MM-DD HH:mm:ss')
      doc.unit = doc.unit || (doc.award && doc.award.unit) || '';
      doc.merchants = (doc.award && doc.award.merchants) ? doc.award.merchants.map(function(row) {
        return row.name;
      }).filter(function(row) { return row;} ): [];
      delete doc.award;
      delete doc.end_date;
      batch.push(doc);
      i++
      if(i % 1000 == 0) {
        console.log(i)
      }
      if (batch.length >= batchSize) {
        await insertBatch();
      }
    })
    cursor.on('end', async function(err) {
      console.log('mongo query end');
      await insertBatch(); // Insert any remaining data
      await ch.query({query: "OPTIMIZE TABLE pcc FINAL"});
      console.log("optimize pcc finish")
      await ch.close()
    });
});

