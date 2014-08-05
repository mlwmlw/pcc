var render = require('./lib/render');
var logger = require('koa-logger');
var route = require('koa-route');
var parse = require('co-body');
var serve = require('koa-static');
var mount = require('koa-mount');
var koa = require('koa');
var app = koa();

app.use(logger());
// logger

app.use(route.get('/', function *(next) {
	this.body = yield render('main')
}));
app.use(route.get('/units', function *(next) {
	this.body = yield render('units')
}));

app.use(mount('/assets', serve('assets')));
app.listen(8889);
