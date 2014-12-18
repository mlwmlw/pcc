require! <[mongodb]>
_ = require \lodash
uri = require \./database
start = new Date!
client = mongodb.MongoClient
#client = client.connect "mongodb://node:1qazxsw2!@oceanic.mongohq.com:10024/pcc", (err, db) ->
#client = client.connect "mongodb://user:1qazxsw2!@ds052827.mongolab.com:52827/pcc", (err, db) ->
client = client.connect uri, (err, db) ->
	
	console.log +new Date! - +start
	collection = db.collection 'pcc'
	collection.aggregate { $group: { _id: { year: { $year: '$publish'}, month: { $month: '$publish'} } } }, (err, docs) ->
		console.log docs
		console.log +new Date! - +start

#	collection.aggregate { 
#		$group: { 
#			_id: { 
#				year: { 
#					$year: '$publish'
#				}, 
#				month: { 
#					$month: '$publish'
#				} 
#			} 
#		} 
#	}, (err, docs) ->

	##collection.find {publish: new Date 103, 4, 30 } .toArray (err, docs) ->
	#collection.find {name: /.*中油.*/ } .toArray (err, docs) ->
	#	docs.forEach (doc) ->
	#		console.log doc
	#	db.close!
		
