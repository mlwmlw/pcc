var render = require('./lib/render');
var logger = require('koa-logger');
var route = require('koa-route');
var parse = require('co-body');
var serve = require('koa-static');
var mount = require('koa-mount');
var koa = require('koa');
var app = koa();

require('nodetime').profile({
	accountKey: '72f6a662ad4d3027a6b8bf66297e78bb79a6e63c', 
	appName: 'pcc'
});

app.use(logger());
// logger

app.use(route.get('/', function *(next) {
	this.body = yield render('main')
}));
app.use(route.get('/units/:unit?', function *(unit, next) {
	this.body = yield render('units', {unit: unit})
}));
app.use(route.get('/about', function *(next) {
	this.body = yield render('about')
}));

app.use(mount('/assets', serve('assets')));
app.listen(8889);
