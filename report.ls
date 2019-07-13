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

start = moment process.argv[2] .utcOffset '+0800' 
end = moment start .add {months: 1}


console.log(start, end)
pcc = db.collection('pcc')
pcc.aggregate [
{$match: {publish: {$gte: start.toDate!, $lte: end.toDate!}}},
{$group: {_id: {unit_id: "$unit_id", job_number: "$job_number"}, price: {$max: "$price"}}},
{$group: {_id: "$_id.unit_id", price: {$sum: "$price"}, count: {$sum: 1}}}
], (err, result) ->
	if err
		console.log	err

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
			#name = units[row._id.replace(/\s+/, '')].name
			if units[row._id.replace(/\s+/, '')]
				name = units[row._id.replace(/\s+/, '')].name
			else
				name = row._id.replace(/\s+/, '')
			unit = findParent name
			return { 
				#ids: row.value.ids
				#repeat: row.value.repeat
				parent: unit
				unit: name
				count: row.count
				price: row.price
			}
		db.collection \report .update {
			_id: process.argv[2]
		}, {
			_id: process.argv[2],
			updated_at: new Date(),
			res: result
		}, {upsert: true}, (err, res) ->
			console.log err
			#console.log res
			process.exit!


