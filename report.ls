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
	emit this.unit, {count: 1, price: +this.price}

reducer = (key, values) ->
	price = 0
	count = 0
	for value in values
		count += value.count
		price += +value.price
	return {count: count, price: price, unit: value.unit}

pcc = db.collection('pcc')
pcc.mapReduce mapper, reducer, {
	query: {publish: {
		$gte: start.toDate!,
		$lte: end.toDate!
	}},
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
			return { 
				parent: unit
				unit: name
				count: row.value.count,
				price: row.value.price
			}
		#console.log result
		db.collection \report .insert {
			_id: process.argv[2],
			res: result
		}, (err, res) ->
			console.log err
			console.log res
			process.exit!

