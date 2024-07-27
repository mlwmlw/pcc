pcc.gXv.tw
===
demo: https://pcc.mlwmlw.org/
api: https://pcc.mlwmlw.org/api


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
* GET /keyword/:keyword https://pcc.mlwmlw.org/api/keyword/陸軍 用關鍵字搜尋標案 
* GET /categories https://pcc.mlwmlw.org/api/categories 取得所有分類
* GET /category/:category https://pcc.mlwmlw.org/api/category/工程類 取得該分類最新 200 筆標案
* GET /units/:id https://pcc.mlwmlw.org/api/units/2 取得子機關
* GET /unit/:unit/:month? https://pcc.mlwmlw.org/api/unit/總統府/2024-07 取得某月該機關招標案件
* GET /date/tender/:date https://pcc.mlwmlw.org/api/date/award/2014-08-05 取得某日招標案件
* GET /date/award/:date https://pcc.mlwmlw.org/api/date/award/2024-07-01 取得某日得標案件
