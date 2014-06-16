require! <[ fs express http mongodb q ]>

app = express!
## app.engine 'haml' (require 'hamljs').render
app.configure ! ->
	express.static __dirname + '/public' |> app.use
	app.set 'views', __dirname+'/views'
	app.set 'view engine' 'jade'
	app.set 'port' (process.env.PORT or 8888)

deferred = q.defer!
client = mongodb.MongoClient
connectDB = (cb) ->
	client.connect "mongodb://node:1qazxsw2!@oceanic.mongohq.com:10024/pcc", (err, db) ->
		cb db
connectDB (db) ->
	collection = db.collection 'pcc'
	collection.find {} .limit 3000 .toArray (err, docs) ->
		console.log 'data ready'
		deferred.resolve docs
		db.close!

app.get '/page/:page', (req, res) ->
	deferred.promise.then (pcc) ->
		page = req.params.page
		perPage = 30
		res.send pcc.slice page * perPage, (+page+1) * perPage

app.get '/keyword/:keyword', (req, res) ->
	connectDB (db) ->
		db.collection 'pcc' .find {name: new RegExp ".*" + req.params.keyword + ".*"} .toArray (err, docs) ->
			res.send docs
			db.close!
			
http.createServer app .listen (app.get 'port'), ->
	console.log 'Express server listening on port ' + app.get 'port'
