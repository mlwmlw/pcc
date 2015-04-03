var render = require('./lib/render');
var logger = require('koa-logger');
var route = require('koa-route');
var parse = require('co-body');
var serve = require('koa-static');
var mount = require('koa-mount');
var gzip = require('koa-gzip');
var koa = require('koa');
var app = koa();

app.use(logger());
// logger

app.use(gzip());
app.use(route.get('/', function *(next) {
	this.body = yield render('main');
}));
app.use(route.get('/date/:type?', function *(type, next) {
	this.body = yield render('date', {type: type});
}));

app.use(route.get('/unit/:unit?', function *(unit, next) {
	this.body = yield render('unit', {unit: unit});
}));
app.use(route.get('/units/:unit?', function *(next) {
	this.body = yield render('units');
}));
app.use(route.get('/about', function *(next) {
	this.body = yield render('about');
}));
app.use(route.get('/rank/:type?', function *(type, next) {
	this.body = yield render('rank', {type: type});
}));
app.use(route.get('/merchants/:id?', function *(id, next) {
	if(id)
		this.body = yield render('merchant');
	else
		this.body = yield render('merchants');
}));

app.use(route.get('/hackpad', function *(next) {
	this.body = yield render('hackpad')
}));

app.use(mount('/assets', serve('assets')));
app.listen(8889);
