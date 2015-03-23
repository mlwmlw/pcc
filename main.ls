require! <[ ./tender mongodb q progress moment]>
uri = require \./database
client = mongodb.MongoClient
client = client.connect uri, (err, db) ->
	collection = db.collection 'pcc'
	#.subtract 'days', 3
	today = tender.getDocsByDate moment process.argv[2] .then (res) ->
		#collection.remove (err, result) ->
		#	console.log 'clear pcc collection'
		rows = []
		for key, page of res
			Array.prototype.push.apply rows, page.rows

		promises = []
		i = 0
		bar = new progress 'updating [:bar] :percent :elapsed', { total: rows.length, width: 40 }
		for key, row of rows
			row._id = row.key
			deferred = q.defer!
			let deferred 
				collection.update {_id: row.key}, row, {upsert: true}, (err, docs) -> 
					#i++
					#console.log "%d", (i/rows.length * 100).toFixed(1)
					bar.tick!
					deferred.resolve docs	
			promises.push deferred.promise
		q.all promises .done (res) ->
			db.close!

#total = today.getTotal!

#for key, value of today.next
#	console.log value
