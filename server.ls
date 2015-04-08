require! <[ fs express http mongodb q moment redis compression ]>
_ = require 'lodash'
uri = require \./database
app = express!
## app.engine 'haml' (require 'hamljs').render
express.static __dirname + '/public' |> app.use
app.set 'views', __dirname+'/views'
app.set 'view engine' 'jade'
app.set 'port' (process.env.PORT or 8888)
cache = redis.createClient!
client = mongodb.MongoClient
err, db <- client.connect uri
deferred = null
getAll = !->
	if deferred
		return deferred.promise
	deferred := q.defer!
	collection = db.collection 'pcc'
	collection.find {} .sort {publish: -1} .toArray (err, docs) ->
		console.log 'data ready all : '
		deferred.resolve docs
	deferred.promise

app.use compression!
app.use (req, res, next) ->
	res.setHeader 'Content-Type', 'application/json'
	if /rank|units|month|categories|units_stats/.test req.path
		send = res.send
		res.send = (result) ->
			cache.set req.path, result
			cache.expire req.path, 3600
			send.call res, result
		err, reply <- cache.get req.path
		if reply
			res.setHeader 'cache', 'HIT'
			send.call res, reply
		else
			res.setHeader 'cache', 'MISS'
			next!
	else
		next!

	
app.get '/page/:page', (req, res) ->
	getAll!.then (pcc) ->
		page = req.params.page
		perPage = 30
		res.send pcc.slice page * perPage, (+page+1) * perPage

app.get '/keyword/:keyword', (req, res) ->
	if(!req.params.keyword)
		return res.send \failed
	reg = new RegExp req.params.keyword
	db.collection 'pcc' .find {$or: [{name: reg}, {unit: reg}, {'award.merchants.name': reg}]} .sort {publish: -1} .toArray (err, docs) ->
		res.send docs
		db.collection 'search_log' .insert {keyword: req.params.keyword, ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress, ts: new Date!}, (err, res) ->
		if err
			console.log err

app.get '/date/:type/:date', (req, res) ->
	date = new Date req.params.date
	date.setDate date.getDate! - 1
	tomorrow = new Date req.params.date
	tomorrow.setDate date.getDate! + 1
	c = if req.params.type=='tender' then 'pcc' else 'award'
	db.collection c .find {publish: { $gte: date, $lt: tomorrow }} .sort {price: -1} .toArray (err, docs) ->
		res.send docs

app.get '/month', (req, res) ->
	collection = db.collection 'pcc'
	collection.aggregate { $group: { _id: { year: { $year: '$publish'}, month: { $month: '$publish'} } } }, (err, docs) ->
		monthes = _.pluck docs, '_id'
		monthes = monthes.map (val) ->
			val.name = val.year + ' 年 ' + val.month + ' 月'
			return val
		res.send monthes

app.get '/dates', (req, res) ->
	db.collection 'pcc' .aggregate { $group: { _id: '$publish'}}, (err, docs) ->
		dates = _.pluck docs, '_id'
		dates = dates.map (val) ->
			moment val .zone '+0800' .format!
		dates.sort!
		res.send dates

app.get '/categories', (req, res) ->
	db.collection 'pcc' .aggregate { $group: { _id: '$category'}}, (err, docs) ->
		res.send _.pluck docs, '_id'

app.get '/category/:category', (req, res) ->
	db.collection 'pcc' .find { category: req.params.category } .limit 200 .toArray (err, docs) ->
		res.send docs

app.get '/merchants/', (req, res) ->
	err, merchants <- db.collection 'merchants' .find {} .toArray
	res.send merchants

app.get '/merchant/:id?', (req, res) ->
	id = req.params.id
	if !id
		return res.send {}
	if /\d+/.test id 
		filter = {"award.merchants._id": id} 
	else
		filter = {"award.merchants.name": id}
	err, docs <- db.collection 'pcc' .find filter .toArray
	res.send docs

app.get '/tender/rank/', (req, res) ->
	start = moment!.startOf 'month' .toDate!
	end = moment!.endOf 'month' .toDate!
	err, tenders <- db.collection 'pcc' .find {publish: {$gte: start, $lte: end}} .sort {price: -1} .limit 100 .toArray
	res.send tenders

app.get '/partner', (req, res) ->
	db.collection 'award' .aggregate [
		{$match: {merchants: {$exists: 1}}},
		{$unwind: "$merchants"},
		{$group: {_id: {unit: "$unit", merchant:"$merchants.name", merchant_id: "$merchants._id"}, price: {$sum: "$price"}, count: {$sum: 1}}},
		{$sort: {count: -1}},
		{$limit: 50},
		{$project: {unit: "$_id.unit", merchant: {_id: "$_id.merchant_id", name: "$_id.merchant"}, price: "$price", count: "$count"}}
	], (err, docs) ->
		res.send docs

app.get '/merchants/rank/:order?', (req, res) ->
	$sort = {}
	$sort.$sort = {};
	$sort.$sort[req.params.order || "sum"] = -1;
	err, merchants <- db.collection 'pcc' .aggregate [
	{ $unwind: "$award.merchants" }, 
	{ $match: { "award.merchants._id": {$ne: ""}}},
	{ $group : {_id: "$award.merchants._id", merchants: {$addToSet: "$award.merchants"}, count: {$sum: 1}, sum: {$sum: "$award.merchants.amount"}}}, 
	$sort, 
	{ $limit: 100}]
	for i,m of merchants
		m.merchant = m.merchants.pop!
		delete m.merchants
	res.send merchants

app.get '/units/:id?', (req, res) ->
	if req.params.id == 'all'
		err, docs <- db.collection 'pcc' .aggregate { $group: { _id: '$unit'}}
		units = _.pluck docs, '_id'
		units.sort!
		res.send units	
	else
		parent = req.params.id
		err, units <- db.collection 'unit' .find { parent: parent } .toArray
		units.sort (a, b) ->
			a._id.replace('.', '') - b._id.replace('.', '')
		res.send units

app.get '/unit/:unit/:month?', (req, res) ->
	filter = { unit: {"$regex": "^" + req.params.unit + ".{0,1}$"}}
	if req.params.month
		start = new Date req.params.month + "-01"
		end = new Date req.params.month + "-01"
		end.setMonth end.getMonth!+1 
		filter.publish = {$gte: start, $lt: end}
	console.log filter
	db.collection 'pcc' .find filter .toArray (err, docs) ->
		docs.sort (a, b) ->
			return b.publish - a.publish
		res.send docs

app.get '/units_stats/:start/:end?', (req, res) ->
	if req.params.end
		filter = {
			_id: {
				"$gte": req.params.start,
				"$lte": req.params.end
			}
		}
	else
		filter = {_id: req.params.start}
	
	err, data <- db.collection 'report' .find filter .toArray
	if err
		console.log err
		res.send []
	else
		if data.length == 1
			res.send data[0].res
		else
			result = {}
			for value in data
				result[value._id] = value.res
			res.send result
				

#app.get '/units_stats/:date?/:days?', (req, res) ->
#	db <- connectDB
#	deferred = q.defer!
#	db.collection 'unit' .find {} .toArray (err, units) ->
#		#units.sort (a, b) ->
#		#	a._id.replace('.', '') - b._id.replace('.', '')
#		units = units.reduce (res, unit, key) ->
#			res[unit.name] = unit
#			res[unit._id] = unit
#			return res
#		, {}
#		deferred.resolve units
#
#	
#	start = moment req.params.date .zone '+0800' 
#
#	if req.params.days
#		end = moment start .add {days: req.params.days}
#	else
#		end = moment start .add {months: 1}
#
#	mapper = !->
#		emit this.unit, {count: 1, price: +this.price}
#
#	reducer = (key, values) ->
#		price = 0
#		count = 0
#		for value in values
#			count += value.count
#			price += +value.price
#		return {count: count, price: price, unit: value.unit}
#	
#	pcc = db.collection('pcc')
#	pcc.mapReduce mapper, reducer, {
#		query: {publish: {
#			$gte: start.toDate!,
#			$lte: end.toDate!
#		}},
#		out: { inline: 1 }
#	}, (err, result) ->
#		if err
#			console.log err
#		deferred.promise.then (units) ->
#			findParent = (id, unit)->
#				if units[id] && units[id].parent == null
#					return units[id].name
#				else if units[id] && units[id].parent != null
#					return findParent units[id].parent, units[id]
#				else if unit
#					return unit.name
#				else
#					return ''
#			result := result.map (row) ->
#				name = row._id.replace(/\s+/, '')
#				unit = findParent name
#				return { 
#					parent: unit
#					unit: name
#					count: row.value.count,
#					price: row.value.price
#				}
#			units = null
#			res.send result

app.get '/units_count', (req, res) ->
	mapper = !->
		emit this.parent, {count: 1,unit: this.name}
	reducer = (key, values) ->
		count = 0
		price = 0
		for value in values
			count += value.count
			price += value.count
		return {count: count, unit: value.unit}
	pcc = db.collection('unit')
	pcc.mapReduce mapper, reducer, {
		query: {},
		out: { inline: 1 }
	}, (err, result) ->
		if err
			console.log err
		res.send result

app.get '/month/:month', (req, res) ->
	start = new Date req.params.month + "-1"
	end = new Date req.params.month + "-1"
	end.setMonth end.getMonth!+1 
	mapper = !->
		emit this.unit, this.price
	reducer = (key, values) ->
		sum = 0
		for value in values
			sum += +value
		sum
	pcc = db.collection('pcc')
	pcc.mapReduce mapper, reducer, {
		query: {end_date: { $gte: start, $lt: end }},
		out: { inline: 1 }
	}, (err, result) ->
		if err
			console.log 'err'
			console.log err
		res.send result

http.createServer app .listen (app.get 'port'), ->
	console.log 'Express server listening on port ' + app.get 'port'
