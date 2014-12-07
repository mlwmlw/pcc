require! <[ fs express http mongodb q moment ]>
_ = require 'lodash'
app = express!
## app.engine 'haml' (require 'hamljs').render
express.static __dirname + '/public' |> app.use
app.set 'views', __dirname+'/views'
app.set 'view engine' 'jade'
app.set 'port' (process.env.PORT or 8888)

client = mongodb.MongoClient
connectDB = (cb) ->
	client.connect "mongodb://node:1qazxsw2!@oceanic.mongohq.com:10024/pcc", (err, db) ->
		cb db
deferred = null
cache = {}
getAll = !->
	if deferred
		return deferred.promise
	deferred := q.defer!
	connectDB (db) ->
		collection = db.collection 'pcc'
		collection.find {} .sort {publish: -1} .toArray (err, docs) ->
			console.log 'data ready all : '
			#console.log docs.length
			
			deferred.resolve docs
	deferred.promise

setInterval !->
	#deferred := null
	cache := {}
	console.log "clear cache"
, 3600 * 1000
getAll!
app.use (req, res, next) ->
	if cache[req.url]
		console.log 'cache hit: ' + req.url
		return res.send cache[req.url]
	else
		console.log 'cache miss: ' + req.url
	res.setHeader 'Content-Type', 'application/json';
	send = res.send
	res.send = (data) ->
		cache[req.url] = data
		send.call res, data
	next!

app.get '/page/:page', (req, res) ->
	getAll!.then (pcc) ->
		page = req.params.page
		perPage = 30
		res.send pcc.slice page * perPage, (+page+1) * perPage

app.get '/keyword/:keyword', (req, res) ->
	console.log req.params.keyword

	connectDB (db) ->
		db.collection 'pcc' .find {name: new RegExp ".*" + req.params.keyword + ".*"} .toArray (err, docs) ->
			res.send docs

app.get '/date/:date', (req, res) ->
	db <- connectDB 
	date = new Date req.params.date
	date.setDate date.getDate! - 1
	tomorrow = new Date req.params.date
	tomorrow.setDate date.getDate! + 1
	console.log date
	db.collection 'pcc' .find {publish: { $gte: date, $lt: tomorrow }} .toArray (err, docs) ->
		res.send docs
app.get '/month', (req, res) ->
	db <- connectDB
	collection = db.collection 'pcc'
	collection.aggregate { $group: { _id: { year: { $year: '$publish'}, month: { $month: '$publish'} } } }, (err, docs) ->
		monthes = _.pluck docs, '_id'
		monthes = monthes.map (val) ->
			val.name = val.year + ' 年 ' + val.month + ' 月'
			return val
		res.send monthes

app.get '/dates', (req, res) ->
	connectDB (db) ->
		db.collection 'pcc' .aggregate { $group: { _id: '$publish'}}, (err, docs) ->
			dates = _.pluck docs, '_id'
			dates = dates.map (val) ->
				moment val .zone '+0800' .format!
			dates.sort!
			res.send dates

app.get '/categories', (req, res) ->
	connectDB (db) ->
		db.collection 'pcc' .aggregate { $group: { _id: '$category'}}, (err, docs) ->
			res.send _.pluck docs, '_id'

app.get '/category/:category', (req, res) ->
	console.log req.params.category
	connectDB (db) ->
		db.collection 'pcc' .find { category: req.params.category } .toArray (err, docs) ->
			res.send docs

app.get '/units/:id?', (req, res) ->
	db <- connectDB
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

app.get '/unit/:unit', (req, res) ->
	connectDB (db) ->
		db.collection 'pcc' .find { unit: new RegExp req.params.unit } .toArray (err, docs) ->
			res.send docs
app.get '/units_stats/:date?/:days?', (req, res) ->
	db <- connectDB
	deferred = q.defer!
	db.collection 'unit' .find {} .toArray (err, units) ->
		#units.sort (a, b) ->
		#	a._id.replace('.', '') - b._id.replace('.', '')
		units = units.reduce (res, unit, key) ->
			res[unit.name] = unit
			res[unit._id] = unit
			return res
		, {}
		deferred.resolve units

	
	start = moment req.params.date .zone '+0800' 

	if req.params.days
		end = moment start .add {days: req.params.days}
	else
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
			units = null
			res.send result

app.get '/units_count', (req, res) ->
	db <- connectDB
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
	db <- connectDB 
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
