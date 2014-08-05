require! <[ fs express http mongodb q ]>
_ = require 'lodash'
app = express!
## app.engine 'haml' (require 'hamljs').render
app.configure ! ->
	express.static __dirname + '/public' |> app.use
	app.set 'views', __dirname+'/views'
	app.set 'view engine' 'jade'
	app.set 'port' (process.env.PORT or 8888)

client = mongodb.MongoClient
connectDB = (cb) ->
	client.connect "mongodb://node:1qazxsw2!@oceanic.mongohq.com:10024/pcc", (err, db) ->
		cb db

deferred = null
getAll = !->
	if deferred
		return deferred.promise
	deferred := q.defer!
	connectDB (db) ->
		collection = db.collection 'pcc'
		collection.find {} .sort {publish: -1} .toArray (err, docs) ->
			console.log 'data ready all : '
			console.log docs.length
			setTimeout !->
				deferred := null
				getAll!
			, 12 * 3600 * 1000
			deferred.resolve docs
	deferred.promise

getAll!
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
	connectDB (db) ->
		date = new Date req.params.date
		tomorrow = new Date req.params.date
		tomorrow.setDate date.getDate! + 1
		db.collection 'pcc' .find {publish: { $gte: date, $lt: tomorrow }} .toArray (err, docs) ->
			res.send docs

app.get '/dates', (req, res) ->
	connectDB (db) ->
		db.collection 'pcc' .aggregate { $group: { _id: '$publish'}}, (err, docs) ->
			res.send _.pluck docs, '_id'

app.get '/categories', (req, res) ->
	connectDB (db) ->
		db.collection 'pcc' .aggregate { $group: { _id: '$category'}}, (err, docs) ->
			res.send _.pluck docs, '_id'

app.get '/category/:category', (req, res) ->
	console.log req.params.category
	connectDB (db) ->
		db.collection 'pcc' .find { category: req.params.category } .toArray (err, docs) ->
			res.send docs

app.get '/units', (req, res) ->
	connectDB (db) ->
		db.collection 'pcc' .aggregate { $group: { _id: '$unit'}}, (err, docs) ->
			res.send _.pluck docs, '_id'

app.get '/unit/:unit', (req, res) ->
	connectDB (db) ->
		db.collection 'pcc' .find { unit: new RegExp req.params.unit } .toArray (err, docs) ->
			res.send docs

http.createServer app .listen (app.get 'port'), ->
	console.log 'Express server listening on port ' + app.get 'port'
