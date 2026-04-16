require! <[ fs express http mongodb q moment ]>
_ = require 'lodash'
uri = require \./database
client = mongodb.MongoClient uri, {
	connectTimeoutMS: 10000,
	serverSelectionTimeoutMS: 120000,
	useUnifiedTopology: true
}
err <- client.connect
db = client.db('pcc')
start_month = process.argv[3] || process.argv[2]
console.log(start_month)
deferred = q.defer!
db.collection 'unit' .find {} .toArray (err, units) ->
	units = units.reduce (res, unit, key) ->
		res[unit.name] = unit
		res[unit._id] = unit
		return res
	, {}
	#deferred.resolve units
	start = moment start_month, "YYYY-MM-DD" .utcOffset '+0800' 
	end = moment start .add {months: 1}
	console.log(start, end)
	pcc = db.collection('pcc')
	pcc.aggregate [
	{$match: {publish: {$gte: start.toDate!, $lte: end.toDate!}}},
	{$group: {_id: {unit_id: "$unit_id", job_number: "$job_number"}, price: {$max: {$ifNull: ["$price", 0]}}}},
	{$group: {_id: "$_id.unit_id", price: {$sum: "$price"}, count: {$sum: 1}}},
	{$lookup: {
		as: 'unit',
		from: 'unit',
		localField: "_id",
		foreignField: "_id"
	}},
	{$lookup: {
		as: 'unit2',
		from: 'unit',
		localField: "unit.parent",
		foreignField: "_id"
	}},
	{$lookup: {
		as: 'unit3',
		from: 'unit',
		localField: "unit2.parent",
		foreignField: "_id"
	}},
	{$lookup: {
		as: 'unit4',
		from: 'unit',
		localField: "unit3.parent",
		foreignField: "_id"
	}},
	{$unwind: "$unit"},
	{$unwind: "$unit2"},
	{$unwind: "$unit3"},
	{$unwind: "$unit4"},
	{$project: {
		parent_id :{ $ifNull: [ "$unit4._id", {$ifNull: ["$unit3._id", {$ifNull: ["$unit2._id", "$unit._id"]}]}]}, 
		parent: { $ifNull: [ "$unit4.name", {$ifNull: ["$unit3.name", {$ifNull: ["$unit2.name", "$unit.name"]}]}]}, 
		_id: "$unit.name",
		price: 1, count: 1}},
	{$group: {_id: "$_id", parent: {$max: "$parent"}, parent_id: {$max: "$parent_id"}, price: {$sum: "$price"}, count: {$sum: "$count"}}},
	{$match: {parent_id: {$not: /\d{5,}/}}}
	] .toArray (err, result) ->
		if err
			console.log	err

		db.collection \report .updateOne {
			_id: start_month
		}, {
			$set: {
				updated_at: new Date(),
				res: result
			}
		}, {upsert: true}, (err, res) ->
			console.log err
			# console.log res
			process.exit!


