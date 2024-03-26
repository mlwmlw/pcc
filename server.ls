require! <[ fs express http mongodb q moment redis compression unified]>
_ = require 'lodash'
https = require('https');
cors = require 'cors'
isbot = require 'isbot'
nodejieba = require("nodejieba");
const ch = require('./clickhouse').ch

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
#cache = redis.createClient({url: 'redis://direct.mlwmlw.org'})
client = mongodb.MongoClient uri, {
	connectTimeoutMS: 10000,
	serverSelectionTimeoutMS: 120000,
	useUnifiedTopology: true
}
err <- client.connect
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

app.use (req, res, next) ->
	res.set('Cache-control', 'public, max-age=3600')
	next!

app.use compression!
# app.use (req, res, next) ->
# 	res.setHeader 'Content-Type', 'application/json'
# 	if /merchants|rank|units|month|categories|units_stats/.test req.path
# 		key = req.path;
# 		key = key + "?" + qs.stringify(req.query);
# 		send = res.send
# 		res.send = (result) ->
# 			cache.set key, result
# 			cache.expire key, 3600*24
# 			send.call res, result
# 		err, reply <- cache.get key
# 		if reply
# 			res.setHeader 'cache', 'HIT'
# 			send.call res, reply
# 		else
# 			res.setHeader 'cache', 'MISS'
# 			next!
# 	else
# 		next!

	
app.get '/page/:page', (req, res) ->
	getAll!.then (pcc) ->
		page = req.params.page
		perPage = 30
		res.send pcc.slice page * perPage, (+page+1) * perPage

app.post '/keyword/:keyword', (req, res) ->
	db.collection 'search_log' .insertOne {
		keyword: req.params.keyword, 
		ip: req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.connection.remoteAddress, 
		ua: req.get('User-Agent'),
		ts: new Date!
	}, (err, res) ->
		if err
			console.log err
	res.send true

app.get '/keyword/:keyword', (req, res) ->
	if(!req.params.keyword)
		return res.send \failed
	tags = nodejieba.cut(req.params.keyword, true).filter (str) ->
		str.trim!

	stream = ch.query("SELECT job_number, max(name) name, max(unit) unit, max(unit_id) unit_id, toDate(min(publish)) publish, max(merchants) merchants FROM 
pcc where 
not(has(multiSearchAllPositionsCaseInsensitiveUTF8(concat(
pcc.name, ' ', pcc.unit, ' ', arrayStringConcat(pcc.merchants)
), ['" + tags.join("','") + "']), 0)) 
group by job_number order by publish desc limit 1000 FORMAT JSON")
	rows = []
	
	stream.on 'data', (row) ->
		rows.push row

	stream.on 'end', (end) ->
		db.collection 'search_result' .insertOne {
			keyword: req.params.keyword, 
			ip: req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.connection.remoteAddress, 
			ua: req.get('User-Agent'),
			tags: tags,
			count: rows.length,
			ts: new Date!
		}
		res.send rows

	#db.collection 'search_log' .insertOne {
	#	keyword: req.params.keyword, 
	#	ip: req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.connection.remoteAddress, 
	#	ts: new Date!
	#}, (err, res) ->
	#if err
	#	console.log err

app.get '/keywords', (req, res) -> 
	db.collection 'search_log' .aggregate [
	{$match: {ts: {$gt: moment().subtract(7, 'days').toDate! }, keyword: {$ne: "undefined"}}},
	{$group: {_id: "$keyword", count: {$sum: 1}}},
	{$sort: {count: -1}},
	{$limit: 30},
	{$lookup:
		{
			as: 'result',
			from: 'search_result',
			let: {
				keyword: "$_id"
			},
			pipeline: [{
				$match: {
					ts: {$gt: moment().subtract(7, 'days').toDate! },
					$expr: {
						$eq: [ "$keyword",  "$$keyword" ]
					}
				},
			}, {
				$group: {_id: "$$keyword", result: {$max: "$count"}}
			}]
		}
	},
	{$project: {count: 1, result: {$arrayElemAt: ["$result", 0]}}},
	{$project: {count: 1, result: "$result.result"}},
	{$match: {$or: [{result: {$gt: 0}}, {result: {$exists: false}}]}},
	{ $sample : { size: 15 } }

	] .toArray (err, docs) -> 
		res.send _.map docs, '_id'

app.get '/date/:type/:date', (req, res) ->
	date = new Date req.params.date
	date.setDate date.getDate! - 1
	tomorrow = new Date req.params.date
	tomorrow.setDate date.getDate! + 1
	c = if req.params.type=='tender' then 'pcc' else 'award'
	filter = if req.params.type=='tender' then {publish: { $gte: date, $lt: tomorrow }} else {end_date: { $gte: date, $lt: tomorrow}}
	db.collection c .find filter .toArray (err, docs) ->
		res.send docs

app.get '/month', (req, res) ->
	collection = db.collection 'pcc'
	collection.aggregate [{ $group: { _id: { year: { $year: '$publish'}, month: { $month: '$publish'} } } }] .toArray (err, docs) ->
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

	db.collection 'pcc' .aggregate [
		{ $match: {publish: {$gte: start, $lt: end}}},
		{ $group: { _id: '$publish'}}
		] .toArray (err, docs) ->
		dates = _.map docs, '_id'
		dates = dates.map (val) ->
			moment val .utcOffset 8 .format!
		dates.sort!
		res.send dates

app.get '/categories', (req, res) ->
	db.collection 'pcc' .aggregate [{ $group: { _id: '$category'}}] .toArray (err, docs) ->
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
	{ $limit: 100}], {allowDiskUse: true} .toArray!
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

app.get '/merchants_count', (req, res) ->
	err, count <- db.collection 'merchants' .count!
	return res.send { count: count }

app.get '/merchants/:id?', (req, res) ->
	id = req.params.id
	query = req.query.filter && JSON.parse(req.query.filter)
	if !query
		query = []
	filter = {name: {$exists: true}}
	if /\d+/.test id 
		filter = {_id: id} 
	else if id
		filter = {name: id}
	for i in query
		filter[i.id] = new RegExp(i.value)
	
	if(req.query.count) 
		err, count <- db.collection 'merchants' .count {name: {$exists: true}} 
		return res.send ""+count
	else
		page = req.query.page || 1
		page -= 1
		#merchants = merchants.slice(page * 100, page * 100 + 100)
		err, merchants <- db.collection 'merchants' .find filter, {name: 1, address: 1, phone: 1, org: 1, _id: 1} .limit 100 .skip(page * 100) .toArray
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
	err, result <- db.collection 'merchants' .find filter .sort {_id: -1} .toArray
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
	docs = _(docs).groupBy 'name'
		.map (vals, key) ->
			return _.assign(vals[0], {
				publish: _.min(vals.map (val) ->
					return val.publish;
				)
			})
		.value()
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
	for value in tenders
		value.tags = _.union(
			nodejieba.cutForSearch(value.name), 
			nodejieba.cutForSearch(value.unit || ""),
			nodejieba.cutForSearch(if value.award && value.award.merchants.length > 0 then value.award.merchants[0].name else "")
		)
		value.tags = _.filter(value.tags, (word) -> 
			word.length > 1 
		)

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
	] .toArray (err, docs) ->
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
	docs.toArray!.then (docs) ->
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
	units = [unit]
	stream = ch.query("SELECT distinct name FROM unit where _id like '" + unit + "' or parent_name like '" + unit + "' or parent_id like '" + unit+ "' limit 1000 FORMAT JSON")
	stream.on 'data', (row) ->
		units.push row.name
	stream.on 'end', (end) ->
		filter.unit = {$in: units}
		db.collection 'pcc' .find filter .sort {publish: -1} .limit 2000 .toArray (err, docs) ->
			docs = _(docs).groupBy 'job_number'
			.map (vals, key) ->
				return _.assign(vals[0], {
					publish: _.min(vals.map (val) ->
						return val.publish;
					)
				})
			.value()
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
	readStream = fs.readFile './web/views/news.md', 'utf8', (err, data) ->	
		req = https.request {
			host: 'api.github.com',
			path: '/markdown'
			method: 'POST',
			headers: {
				'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36'
				'Content-Type': 'application/json'
			}
		}, (socket) ->
			html = []
			socket.on 'data', (data) ->
				html.push(data)
			socket.on 'end', (data) ->
				res.send Buffer.concat(html).toString('utf8')

		req.write(JSON.stringify({text: data}))
		req.end()

app.post '/pageview/:type/:key', (req, res) ->
	if isbot(req.get('user-agent'))
		return res.send true
	db.collection 'pageview' .insertOne {
		type: req.params.type, 
		id: req.params.key,
		ip: req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.connection.remoteAddress, 
		ua: req.get('User-Agent'),
		ts: new Date!
	}, (err, res) ->
		if err
			console.log err
	res.send true

app.get '/hot/tenders', (req, res) ->
	db.collection 'pageview' .aggregate([
	{$match: {type: "tender", ts: {$gt: moment().subtract(1, 'days').toDate!}}},
	{$group: {_id: {id: "$id", ip: "$ip"}, count: {$sum: 1}}},
	{$group: {_id: "$_id.id", count: {$sum: 1}}},
	{$sort: {count: -1}},
	{$lookup: {
			as: 'tender',
			from: 'pcc',
			localField: "_id",
			foreignField: "_id"
	}},
	{$unwind: "$tender"},
	{$project: {_id: 1, name: "$tender.name", count: 1, unit: "$tender.unit", job_number: "$tender.job_number"}},
	{$limit: 20}
	{ $sample : { size: 10 } }
	]).toArray (err, docs) -> 
		res.send docs

app.get '/hot/unit', (req, res) ->
	db.collection 'pageview' .aggregate([
	{$match: {type: "unit", ts: {$gt: moment().subtract(1, 'days').toDate!}}},
	{$group: {_id: {id: "$id", ip: "$ip"}, count: {$sum: 1}}},
	{$group: {_id: "$_id.id", count: {$sum: 1}}},
	{$sort: {count: -1}},
	{$lookup: {
			as: 'unit',
			from: 'unit',
			localField: "_id",
			foreignField: "_id"
	}},
	{$unwind: "$unit"},
	{$project: {_id: 1, name: "$unit.name", count: 1, unit: "$unit._id"}},
	{$limit: 15}
	{ $sample : { size: 10 } }
	]).toArray (err, docs) -> 
		res.send docs

app.get '/hot/merchant', (req, res) ->
	db.collection 'pageview' .aggregate([
	{$match: {type: "merchant", ts: {$gt: moment().subtract(1, 'days').toDate!}}},
	{$group: {_id: {id: "$id", ip: "$ip"}, count: {$sum: 1}}},
	{$group: {_id: "$_id.id", count: {$sum: 1}}},
	{$sort: {count: -1}},
	{$lookup: {
			as: 'merchant',
			from: 'merchants',
			localField: "_id",
			foreignField: "_id"
	}},
	{$unwind: "$merchant"},
	{$project: {_id: 1, name: "$merchant.name", count: 1, merchant: "$merchant._id"}},
	{$limit: 15}
	{ $sample : { size: 10 } }
	]).toArray (err, docs) -> 
		res.send docs
http.createServer app .listen (app.get 'port'), ->
	console.log 'Express server listening on port ' + app.get 'port'

process.on 'uncaughtException', (err) ->
	console.error(err.stack);
