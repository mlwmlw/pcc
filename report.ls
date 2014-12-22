require! <[ fs express http mongodb q moment ]>
_ = require 'lodash'
uri = require \./database
start_ts = +new Date! 
client = mongodb.MongoClient
err, db <-client.connect uri
console.log 'connected', +new Date! - start_ts
deferred = q.defer!
db.collection 'unit' .find {} .toArray (err, units) ->
	units = units.reduce (res, unit, key) ->
		res[unit.name] = unit
		res[unit._id] = unit
		return res
	, {}
	deferred.resolve units

start = moment process.argv[2] .zone '+0800' 
end = moment start .add {months: 1}

mapper = !->
	emit this.unit, {ids: [this.id], id: this.id, count: 1, price: +this.price, repeat: 0}

reducer = (key, values) ->
	price = 0
	count = 0
	repeat = 0
	ids = []
	for value in values
		if ids.indexOf(value.id) < 0
			ids = ids.concat value.ids
			price += +value.price
		else
			repeat += value.repeat + 1
		count += value.count
	return {ids: ids, count: count, price: price, unit: value.unit, repeat: repeat}

pcc = db.collection('pcc')
pcc.mapReduce mapper, reducer, {
	query: {
		publish: {
			$gte: start.toDate!,
			$lte: end.toDate!
		}
	},
	out: { inline: 1 }
}, (err, result) ->
	if err
		console.log err
	deferred.promise.then (units) ->
		findParent = (id, unit)->
			if units[id] && units[id].parent == null
				return units[id].name
			else if units[id] && units[id].parent != null
				return findParent units[id].parent, units[id]
			else if unit
				return unit.name
			else
				return ''
		result := result.map (row) ->
			name = row._id.replace(/\s+/, '')
			unit = findParent name
			#console.log unit
			#console.log name
			#console.log row.value
			return { 
				#ids: row.value.ids
				#repeat: row.value.repeat
				parent: unit
				unit: name
				count: row.value.count
				price: row.value.price
			}
		#console.log result
		db.collection \report .update {
			_id: process.argv[2]
		}, {
			_id: process.argv[2],
			res: result
		}, {upsert: true}, (err, res) ->
			console.log err
			console.log res
			process.exit!

