require! <[ ./pcc mongodb q]>
client = mongodb.MongoClient
client = client.connect "mongodb://node:1qazxsw2!@oceanic.mongohq.com:10024/pcc", (err, db) ->
	collection = db.collection 'pcc'
	today = pcc.getToday!.then (res) ->
		#collection.remove (err, result) ->
		#	console.log 'clear pcc collection'
		rows = []
		for key, page of res
			Array.prototype.push.apply rows, page.rows

		promises = []
		i = 0
		for key, row of rows
			row._id = row.id
			deferred = q.defer!
			let deferred 
				collection.update {_id: row.id}, row, {upsert: true}, (err, docs) -> 
					#console.log "%d/%d %d", i, rows.length, docs
					deferred.resolve docs	
			promises.push deferred.promise
		q.all promises .done (res) ->
			console.log 'done ' + res.length
			db.close!

#total = today.getTotal!

#for key, value of today.next
#	console.log value
