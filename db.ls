require! <[mongodb]>
client = mongodb.MongoClient
client = client.connect "mongodb://node:1qazxsw2!@oceanic.mongohq.com:10024/pcc", (err, db) ->
	collection = db.collection 'pcc'
	#collection.find {publish: new Date 103, 4, 30 } .toArray (err, docs) ->
	collection.find {name: /.*中油.*/ } .toArray (err, docs) ->
		docs.forEach (doc) ->
			console.log doc
		db.close!
		
