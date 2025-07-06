const mongodb = require('mongodb')
const moment = require('moment')
const ch = require('./clickhouse').ch
const client = mongodb.MongoClient

const queries = [
    `CREATE TABLE pcc (
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
	break;
	const stream = ch.query(query, (err, data) => {
		if(err) {
			console.log(err)
		}	
	})
	stream.pipe(process.stdout)
}
var skip = 1920000;
//skip = 0;
client.connect(require('./database'), function(err, client) {
    pcc = client.db('pcc').collection('pcc');
    var cursor = pcc.find({
    }, {projection: {_id: 1, name: 1, job_number: 1,unit: 1, unit_id: 1, publish: 1, end_date: 1, 'award.name': 1, 'award.unit': 1, 'award.merchants.name': 1}}).skip(skip)
		const clickhouseStream = ch.query('INSERT INTO pcc FORMAT JSONEachRow')
		var i = 0;
		cursor.on('data', function(doc) {
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
			i++
			if(i % 1000 == 0) {
				console.log(i)
			}
			clickhouseStream.write(JSON.stringify(doc));
		});
		clickhouseStream.on('error', function(err) {
			console.log('clickhouse error', err);
		});
		clickhouseStream.on('finish', async function() {
			console.log('clickhouse end');
			await ch.query("OPTIMIZE TABLE pcc FINAL");
			client.close();
		});
		cursor.on('end', function(err) {
			console.log('mongo query end');
			clickhouseStream.end();
		});
		//cursor.pipe(clickhouseStream)

});

