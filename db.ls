require! <[mongodb]>
client = mongodb.MongoClient
client = client.connect "mongodb://node:1qazxsw2!@oceanic.mongohq.com:10024/pcc", (err, db) ->
	collection = db.collection 'test'
	collection.find {} .toArray (err, docs) ->
		docs.forEach (doc) ->
			console.log doc
		db.close!
		
