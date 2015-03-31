require! <[ ./tender ./awarding mongodb q progress moment]>
uri = require \./database
client = mongodb.MongoClient
date = moment process.argv[2]
promiseMe = !->
	deferred = q.defer!
	promises = [];
	return {
		add: (func) ->
			if func.promise
				promises.push func.promise
			else
				d = q.defer!
				promises.push d.promise
				func (err, result)->
					if err
						console.log err
					else
						d.resolve result
				return d
		,done: (cb) ->
				q.all promises .done !->
					deferred.resolve!
					cb!
		,promise: deferred.promise
	}
client = client.connect uri, (err, db) ->
	merchantBulk = db.collection 'merchants' .initializeUnorderedBulkOp!
	awardBulk = db.collection 'award' .initializeUnorderedBulkOp!
	pccBulk = db.collection 'pcc' .initializeUnorderedBulkOp!
	bulk = db.collection 'pcc' .initializeUnorderedBulkOp!
	promiseMain = promiseMe!	
	tender.getDocsByDate date .then (res) ->
		for key, row of res
			row._id = row.key
			if /更正公告/.test row.name
				delete row.name
			publish = moment.min moment(date), moment(row.publish) .toDate!
			delete row.publish
			bulk.find {_id: row.key} .upsert!.update { $set: row, $min: {publish: publish} }
		console.log "tender " + res.length
		if res.length
			promiseMain.add bulk.execute
	awarding.getDocsByDate date .then (res) ->
		promiseSub = promiseMe!	
		awards = res[0]
		merchants = res[1]
		if merchants.length
			for i, m of merchants
				merchantBulk.find {_id: m._id} .upsert!.update {
					$set: m
				}
			promiseSub.add merchantBulk.execute
		if awards.length
			for i, a of awards
				publish = moment(a.origin_publish).zone('+0800').toDate!
				awardBulk.find {_id: a.key} .upsert!.update { 
					$set: a
				}
				pccBulk.find {id: a.id, publish: publish, unit: new RegExp a.unit} .update {
					$set: {award: {_id: a.key, merchants: a.merchants || [], url: a.url, publish: a.publish}}
				}
			promiseSub.add awardBulk.execute
			promiseSub.add pccBulk.execute
		console.log "award " + awards.length
		promiseSub.done !->
			console.log 'sub done'
		promiseMain.add promiseSub
		promiseMain.done !->
			console.log 'main done'
			db.close!
	
