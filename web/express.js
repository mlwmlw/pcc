var express = require('express');
var cons = require('consolidate');
var app = express();

app.engine('ect', cons.ect);
app.set('view engine', 'ect');
app.set('views', __dirname + '/views');
app.use('/assets', express.static('assets'));
app.get('/', function(req, res) {
	res.render('main');	
});
app.get('/units', function (req, res) {
	res.render('units');	
});
app.get('/about', function (req, res) {
	res.render('about');	
});

var server = app.listen(8889, function() {
	console.log('is running');
});
