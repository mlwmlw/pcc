require! <[ fs express http mongodb q moment redis compression unified]>
_ = require 'lodash'
createStream = require 'unified-stream'
markdown = require 'remark-parse'
html = require 'remark-html'
cors = require 'cors'
corsOptions = {
	origin: 'http://pcc.mlwmlw.org:3000',
	optionsSuccessStatus: 200
}
qs = require 'qs'
uri = require \./database
app = express!
express.static __dirname + '/public' |> app.use
app.set 'views', __dirname+'/views'
app.set 'view engine' 'jade'
app.set 'port' (process.env.PORT or 8888)
cache = redis.createClient!
client = mongodb.MongoClient
err, client <- client.connect uri
db = client.db('pcc')
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

app.use cors(corsOptions)

app.use compression!
app.use (req, res, next) ->
	res.setHeader 'Content-Type', 'application/json'
	if /merchants|rank|units|month|categories|units_stats/.test req.path
		key = req.path;
		key = key + "?" + qs.stringify(req.query);
		send = res.send
		res.send = (result) ->
			cache.set key, result
			cache.expire key, 3600*24
			send.call res, result
		err, reply <- cache.get key
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

app.post '/keyword/:keyword', (req, res) ->
	db.collection 'search_log' .insert {
		keyword: req.params.keyword, 
		ip: req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.connection.remoteAddress, 
		ts: new Date!
	}, (err, res) ->
		if err
			console.log err
	res.send true

app.get '/keyword/:keyword', (req, res) ->
	if(!req.params.keyword)
		return res.send \failed
	reg = new RegExp req.params.keyword
	ClickHouse = require('@apla/clickhouse')
	ch = new ClickHouse({ 
		host: 'localhost', port: '7123', user: 'default', password: 'pcc.mlwmlw.org' ,
		queryOptions: {
			database: "pcc",
		}
	})
	stream = ch.query("SELECT job_number, name, unit, toDate(publish) publish, merchants FROM 
pcc where name like '%" + req.params.keyword + "%' or unit like '%" + req.params.keyword + "%' or arrayStringConcat(merchants) like '%" + req.params.keyword + "%' order by publish desc limit 150 FORMAT JSON")
	rows = []
	
	stream.on 'data', (row) ->
		rows.push row

	stream.on 'end', (end) ->
		res.send rows

	db.collection 'search_log' .insertOne {
		keyword: req.params.keyword, 
		ip: req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.connection.remoteAddress, 
		ts: new Date!
	}, (err, res) ->
	if err
		console.log err

app.get '/keywords', (req, res) -> 
	db.collection 'search_log' .aggregate [
	{$match: {ts: {$gt: moment().subtract(1, 'months').toDate! }}},
	{$group: {_id: "$keyword", count: {$sum: 1}}},
	{$sort: {count: -1}},
	{$limit: 20},
	{ $sample : { size: 10 } }
	] .toArray (err, docs) -> 
		res.send _.map docs, '_id'

app.get '/date/:type/:date', (req, res) ->
	date = new Date req.params.date
	date.setDate date.getDate! - 1
	tomorrow = new Date req.params.date
	tomorrow.setDate date.getDate! + 1
	c = if req.params.type=='tender' then 'pcc' else 'award'
	db.collection c .find {publish: { $gte: date, $lt: tomorrow }} .toArray (err, docs) ->
		res.send docs

app.get '/month', (req, res) ->
	collection = db.collection 'pcc'
	collection.aggregate { $group: { _id: { year: { $year: '$publish'}, month: { $month: '$publish'} } } }, (err, docs) ->
		monthes = _.map docs, '_id'
		monthes = monthes.map (val) ->
			val.name = val.year + ' 年 ' + val.month + ' 月'
			return val
		res.send monthes

app.get '/dates', (req, res) ->
	start = moment "20110101 00:00:00", 'YYYYMMDD hh:mm:ss' .toDate!
	end = moment "20300101 00:00:00", 'YYYYMMDD hh:mm:ss' .toDate!
	year = req.query.year
	month = req.query.month
	if month && month < 10
		month = '0' + month
	if year && month
		start = moment year + month + "01 00:00:00", 'YYYYMMDD hh:mm:ss' .toDate!
		end = moment year + month + "01", 'YYYYMMDD hh:mm:ss' .add 1, 'M' .toDate!
	else if year 
		start = moment year + "0101 00:00:00", 'YYYYMMDD hh:mm:ss' .toDate!
		end = moment year + "1231 23:59:59", 'YYYYMMDD hh:mm:ss' .toDate!

	console.log(start, end)
	db.collection 'pcc' .aggregate [
		{ $match: {publish: {$gte: start, $lt: end}}},
		{ $group: { _id: '$publish'}}
		], (err, docs) ->
		dates = _.map docs, '_id'
		dates = dates.map (val) ->
			moment val .zone '+0800' .format!
		dates.sort!
		res.send dates

app.get '/categories', (req, res) ->
	db.collection 'pcc' .aggregate { $group: { _id: '$category'}}, (err, docs) ->
		res.send _.map docs, '_id'

app.get '/category/:category', (req, res) ->
	db.collection 'pcc' .find { category: req.params.category } .limit 200 .toArray (err, docs) ->
		res.send docs

app.get '/rank/merchants/:order?/:year?', (req, res) ->
	year = req.params.year
	start = new Date year, 0, 1
	end = new Date year, 11, 31
	$sort = {}
	$sort.$sort = {};
	$sort.$sort[req.params.order || "sum"] = -1;
	$match = { "award.merchants._id": {$ne: ""}}
	$match.publish = {$gte: start, $lte: end}
	err, merchants <- db.collection 'pcc' .aggregate [
	{ $unwind: "$award.merchants" }, 
	{ $match: $match},
	{ $group : {_id: {$ifNull: ["$award.merchants._id", "$award.merchants.name"]}, merchants: {$addToSet: "$award.merchants"}, count: {$sum: 1}, sum: {$sum: "$award.merchants.amount"}}}, 
	$sort, 
	{ $limit: 100}]
	for i,m of merchants
		m.merchant = m.merchants.pop!
		delete m.merchants
	res.send merchants


app.get '/tree', (req, res) ->
	err, units <- db.collection 'unit' .find {} .toArray
	tree = {
		name: "root",
		children: []
	}
	for u in units
		u.children = []
		for su in units
			if su.parent == u._id
				u.children.push su

	for u in units
		if !u.parent
			children = []
			for s in u.children
				children.push {
					name: s.name,
					children: null
				}
			tree.children.push {
				name: u.name
				children: children
			}
	res.send tree

app.get '/merchant_type/:id?', (req, res) ->
	id = req.params.id
	if id
		err, merchants <- db.collection 'merchants' .find {types: {$elemMatch: {id: id}}}, {name: 1, address: 1, phone: 1, org: 1, _id: 1} .toArray
		res.send merchants
	else
		err, types <- db.collection 'merchant_type' .find {count: {$gt: 1}} .toArray
		res.send types

app.get '/merchants/:id?', (req, res) ->
	id = req.params.id
	query = req.query.filter && JSON.parse(req.query.filter)
	if !query
		query = []
	filter = {}
	if /\d+/.test id 
		filter = {_id: id} 
	else if id
		filter = {name: id}
	for i in query
		filter[i.id] = new RegExp(i.value)
	
	err, merchants <- db.collection 'merchants' .find filter, {name: 1, address: 1, phone: 1, org: 1, _id: 1} .toArray
	if(req.query.count) 
		res.send merchants.length
	page = req.query.page
	if page 
		page -= 1
		merchants = merchants.slice(page * 100, page * 100 + 100)
	if id 
		res.send merchants[0]
	else
		res.send merchants

app.get '/merchant/:id?', (req, res) ->
	id = req.params.id
	if !id
		return res.send {}

	if /\d+/.test id 
		filter = {"_id": id} 
	else
		filter = {"name": id}
	err, result <- db.collection 'merchants' .find filter .toArray
	result = result.pop!
	if !result
		result = {}
	if /\d+/.test id 
		filter = {"award.merchants._id": id} 
	else
		filter = {"award.merchants.name": id}
	err, docs <- db.collection 'pcc' .aggregate [
		{$match: filter},
		{$lookup: {
			as: '_unit',
			from: 'unit',
			localField: "unit_id",
			foreignField: "_id"
		}},
		{$lookup: {
			as: '_parent',
			from: 'unit',
			localField: "_unit.parent",
			foreignField: "_id"
		}},
		{$lookup: {
			as: '_root',
			from: 'unit',
			localField: "_parent.parent",
			foreignField: "_id"
		}},
		{$addFields: {
			parent_unit: {
				$cond: [ {$gt: [{$size: "$_root"}, 0] }, "$_root", 
					{$cond: [ {$gt: [{$size: "$_parent"}, 0] }, "$_parent", "$_unit"]}
				]
			}
		}},
		{$unwind: "$parent_unit"},
		{$project: {_unit: 0, _root: 0, _parent: 0}}
	] .toArray
	docs = _.values(_.keyBy(docs, 'job_number'))
	docs.sort (a, b) ->
		return b.publish - a.publish
	result.tenders = docs
	res.send result

app.get '/tender/:id/:unit?', (req, res) ->
	id = req.params.id
	unit = req.params.unit
	if !id
		return res.send {}
	filter = {id: id}
	if unit
		filter['$or'] = [{unit: new RegExp(unit - /\s+/g)}, {unit_id: unit}]

	err, tenders <- db.collection 'pcc' .find filter .sort {publish: -1} .toArray
	res.send tenders


app.get '/rank/tender/:month?', (req, res) ->
	m = req.params.month
	start = moment m .startOf 'month' .toDate!
	end = moment m .endOf 'month' .toDate!
	err, tenders <- db.collection 'pcc' .find {publish: {$gte: start, $lte: end}} .sort {price: -1} .limit 100 .toArray
	tenders = _.keyBy tenders, 'id'
	tenders = _.toArray tenders
	tenders.sort (a, b) ->
		b.price - a.price
	res.send tenders

app.get '/partner/:year?', (req, res) ->
	year = req.params.year
	start = new Date year, 0, 1
	end = new Date year, 11, 31
	$match = {merchants: {$exists: 1}}
	#$match.publish = {$gte: start, $lte: end}
	$match.end_date = {$gte: start, $lte: end}
	db.collection 'award' .aggregate [
		{$match: $match},
		{$unwind: "$merchants"},
		{$group: {_id: {unit: "$unit", merchant:"$merchants.name", merchant_id: "$merchants._id"}, price: {$sum: {$add: ["$merchants.amount", {$ifNull: ["$price", 0]}]}}, count: {$sum: 1}}},
		{$sort: {count: -1}},
		{$limit: 50},
	{$project: {unit: "$_id.unit", merchant: {_id: "$_id.merchant_id", name: "$_id.merchant"}, price: "$price", count: "$count"}}
	], (err, docs) ->
		res.send docs
app.get '/unit_info/:id?', (req, res) ->
	unit = req.params.id.replace(/\s+/g, '')
	err, docs <- db.collection 'unit' .aggregate [
		{$match: {$or: [{name: unit}, {_id: unit}]}},
		{$lookup: {
			as: 'parent',
			from: 'unit',
			localField: "parent",
			foreignField: "_id"
		}},
		{$lookup: {
			as: 'childs',
			from: 'unit',
			localField: "_id",
			foreignField: "parent"
		}}
	]
	if docs.length > 0
		if docs[0].parent.length > 0
			docs[0].parent = docs[0].parent[0]
		res.send docs[0]
	else
		res.send {}

app.get '/units/:id?', (req, res) ->
	if req.params.id == 'all' 
		err, docs <- db.collection 'pcc' .aggregate { $group: { _id: '$unit'}}
		units = _.map docs, '_id'
		units = units.filter (v) ->
			v
		units = units.map (row) ->
			row.trim!
		
		units = units.filter (v, i, a) -> 
			a.indexOf(v) === i
		units.sort!
		
		res.send units	
	else
		parent = req.params.id
		err, units <- db.collection 'unit' .aggregate [
			{$match: {$and: [{parent: parent}, {parent: {$exists: 1}}]}},
			{$lookup:
				{
					as: 'child',
					from: 'unit',
					let: { 
						unit: "$_id"
					},
					pipeline: [{
						$match: {
							$expr: {
								$eq: [ "$parent",  "$$unit" ]
							}
						},
					}, {
						$group: {_id: 1, count: {$sum: 1}}
					}]

				}
			},
			{$lookup:
				{
					from: 'unit',
					localField: 'parent',
					foreignField: '_id',
					as: 'parents'
				}
			},
			{$lookup:
				{
					as: 'tenders',
					from: 'pcc',
					let: { 
						unit: "$name",
						job_number: "$job_number"
					},
					pipeline: [{
						$match: {
							$expr: {
								$eq: [ "$unit",  "$$unit" ]
							}
						},
					}, {
						$group: {_id: "$job_number"}
					}, {
						$group: {_id: 1, count: {$sum: 1}}
					}]

				}
			},
			{$project: 
				{
				_id: 1, 
				parent_name: {$arrayElemAt: ["$parents.name", 0]},
				parent: 1, 
				name: 1, 
				childs: {$sum: "$child.count"}, 
				tenders: {$sum: "$tenders.count"}
				}
			}
		] .toArray!
		units.sort (a, b) ->
			a._id.replace('.', '') - b._id.replace('.', '')
		res.send units

app.get '/unit/:unit/:month?', (req, res) ->
	unit = req.params.unit.replace(/\s+/g, '')
	filter = {}
	if req.params.month
		start = new Date req.params.month + "-01"
		end = new Date req.params.month + "-01"
		end.setMonth end.getMonth!+1 
		filter.publish = {$gte: start, $lt: end}
	#err, units <- db.collection 'unit' .find {parent: unit} .toArray
	err, units <- db.collection 'unit' .aggregate [
		{$lookup: {
			as: 'parent',
			from: 'unit',
			localField: "parent",
			foreignField: "_id"
		}},
		{$match: {"parent.name": unit}},
		{$project: {name: 1}}
	]

	units = _.map units, 'name'
	units = [].concat(units).concat([unit])
	filter.unit = {$in: units}
	db.collection 'pcc' .find filter .sort {publish: -1} .limit 2000 .toArray (err, docs) ->
		
		docs = _.values(_.keyBy(docs, 'job_number'))
		docs.sort (a, b) ->
			return b.publish - a.publish
		res.send docs

app.get '/lookalike/:merchant', (req, res) ->
	db.collection 'pcc' .aggregate [
		{$match: {"award.candidates._id": req.params.merchant}},
		{$project: {candidates: "$award.candidates"}},
		{$unwind: "$candidates"},
		{$group: {_id: "$candidates._id", name: {$max: "$candidates.name"}, count: {$sum: 1}}},
		{$match: {"_id": {$ne: req.params.merchant}}},
		{$sort: {count: -1}},
		{$limit: 30}
	] .toArray (err, docs) -> 
		if err
			console.log err
		res.send docs

app.get '/unit_lookalike/:unit', (req, res) ->
	db.collection 'pcc' .aggregate [
		{$match: {"unit": req.params.unit, publish: {$gt: moment().subtract(1, 'months').toDate!}}},
		{$project: {candidates: "$award.candidates"}},
		{$unwind: "$candidates"},
		{$group: {_id: "$candidates._id", count: {$sum: 1}}},
		{$sort: {count: -1}},
		{$lookup: {       
				as: 'pcc',
				from: 'pcc',
				localField: "_id",
				foreignField: "award.candidates._id"  
		}},
		{$unwind: "$pcc"},
		{$group: {_id: "$pcc.unit", count: {$sum: 1}}},
		{$match: {"_id": {$ne: req.params.unit}}},
		{$sort: {count: -1}},	
		{$limit: 10}
	], {maxTimeMS: 2000} .toArray (err, docs) -> 
		if err
			console.log err
			res.send []
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
				
app.get '/election', (req, res) ->
	filter = {
		unique_id: {
			"$gt": 0
		}
	}
	err, data <- db.collection 'election' .find filter .sort {expense: -1} .toArray
	if err
		console.log err
		res.send []
	else
		res.send data

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
app.get '/news', (req, res) ->
	processor = unified()
	.use(markdown, {commonmark: true})
	.use(html)
	fs.createReadStream './web/views/news.md'	
	.pipe createStream(processor)
	.pipe res
	/*
memwatch = require 'memwatch'
hd = null
memwatch.on 'leak', (info) ->	
	console.error 'Memory leak detected: ', info
	diff = hd.end!
	console.error util.inspect(diff, true, null) 
	hd = null;
*/	
http.createServer app .listen (app.get 'port'), ->
	console.log 'Express server listening on port ' + app.get 'port'


