pcc.gXv.tw
===
demo: http://pcc.mlwmlw.org/
api: http://pcc.mlwmlw.org/api

狀態
===
被 pcc 鎖 IP 九月以後就暫時沒更新資料-_-

Installation
===
Please go to pcc folder, then input
```
npm install
```

usage
===
get and parse pcc data

  $ lsc main 2014-06-19

run http restful api server on port 8888

  $ lsc server
  
  Express server listening on port 8888

run web ui listening on port 8889
```
$ gulp 
[13:56:42] Using gulpfile ~/node/pcc/web/gulpfile.js
[13:56:42] Starting 'serve'...
spawn 6804
[13:56:42] Finished 'serve' after 16 ms
[13:56:42] Starting 'watch'...
[13:56:42] Finished 'watch' after 195 ms
[13:56:42] Starting 'default'...
[13:56:42] Finished 'default' after 13 μs
```
api endpoint
===
* GET /page/:page http://pcc.mlwmlw.org/api/page/1
* GET /keyword/:keyword http://pcc.mlwmlw.org/api/keyword/陸軍 
* GET /categories http://pcc.mlwmlw.org/api/categories
* GET /category/:category http://pcc.mlwmlw.org/api/category/工程類
* GET /units http://pcc.mlwmlw.org/api/units
* GET /units/:id http://pcc.mlwmlw.org/api/units/0 
  * http://pcc.mlwmlw.org/api/units/0  
* GET /unit/:unit http://pcc.mlwmlw.org/api/unit/總統府
* GET /date/:date http://pcc.mlwmlw.org/api/date/2014-08-05
