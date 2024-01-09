const mongodb = require('mongodb')
const moment = require('moment')
const ch = require('./clickhouse').ch

const client = mongodb.MongoClient

const queries = [
    `CREATE TABLE unit (
        _id String,
        parent_id String,
        parent_name String,
        name String
    ) ENGINE=MergeTree()
    PRIMARY KEY _id`,
];
for(const query of queries) {
	break;
  const stream = ch.query(query, (err, data) => {
    if(err) {
      console.log(err)
    }  
  })
  stream.pipe(process.stdout)
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
    const clickhouseStream = ch.query('INSERT INTO unit FORMAT JSONEachRow')
    var i = 0;
    cursor.on('data', function(doc) {
			i++;
      if(i % 1000 == 0) {
        console.log(i)
      }
      clickhouseStream.write(JSON.stringify(doc));
    });
    clickhouseStream.on('error', function(err) {
      console.log(err)
    });
    clickhouseStream.on('finish', function() {
      console.log('clickhouse end');
      client.close();
    });
    cursor.on('end', function(err) {
      console.log('mongo query end');
      clickhouseStream.end();
    });
    //cursor.pipe(clickhouseStream)

});

