var render = require('./lib/render');
var logger = require('koa-logger');
var route = require('koa-route');
var parse = require('co-body');
var serve = require('koa-static');
var mount = require('koa-mount');
var gzip = require('koa-gzip');
var koa = require('koa');
var request = require('co-request');
var app = koa();

app.use(logger());
// logger

app.use(gzip());
app.use(route.get('/stats', function*(next) {
    this.body = yield render('main');
}));
app.use(route.get('/', function*(next) {
    var news = yield request('http://pcc.mlwmlw.org/api/news');
    this.body = yield render('landing', { page: 'landing', news: news.body });
}));
app.use(route.get('/sitemap.xml', function*(next) {
    var res = yield request('http://pcc.mlwmlw.org/api/dates');
		var dates = JSON.parse(res.body);
		for(var i in dates) {
			dates[i] = dates[i].replace(/T.+$/, '');
		}
    //var mres = yield request('http://pcc.mlwmlw.org/api/merchants');
		//var merchants = JSON.parse(mres.body);
    this.body = yield render('sitemap', { dates: dates });
}));
app.use(route.get('/date/:type?/:date?', function*(type, date, next) {
		var data = {body: 0};
		if(date)
			data = yield request('http://pcc.mlwmlw.org/api/date/tender/' + date);
    this.body = yield render('date', { type: type, date: date, data: data.body});
}));
app.use(route.get('/month', function*(year, month, next) {
    this.body = yield render('dates');
}));
app.use(route.get('/dates/:year?/:month?', function*(year, month, next) {
    this.body = yield render('dates', { year: year, month: month });
}));

app.use(route.get('/unit/:unit?', function*(unit, next) {
    this.body = yield render('unit', { unit: unit, title: (unit || '') + '標案查詢' });
}));
app.use(route.get('/units/:unit?', function*(next) {
    this.body = yield render('units');
}));
app.use(route.get('/about', function*(next) {
    this.body = yield render('about');
}));
app.use(route.get('/rank/:type?', function*(type, next) {
    this.body = yield render('rank', { type: type });
}));
app.use(route.get('/merchant_type/:type?', function*(type, next) {
    this.body = yield render('merchant_type', { type: type });
}));
app.use(route.get('/merchants/:id?/:year?', function*(id, year, next) {
    if (id)
        this.body = yield render('merchant', { id: id, year: year });
    else
        this.body = yield render('merchants');
}));
app.use(route.get('/search/:keyword?', function*(keyword, next) {
    this.body = yield render('search', { keyword: keyword, title: '搜尋' + keyword })
}));

app.use(route.get('/hackpad', function*(next) {
    this.body = yield render('hackpad')
}));
app.use(route.get('/tender/:unit/:id', function*(unit, id, next) {
    this.body = yield render('tender', { unit: unit, id: id })
}));
app.use(route.get('/robots.txt', function* (next) {
		this.body = "User-agent: *\nAllow: /";
}));

app.use(mount('/assets', serve('assets')));
app.listen(8889);
