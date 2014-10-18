pcc.gXv.tw
===
demo: http://pcc.mlwmlw.org/
api: http://pcc.mlwmlw.org/api

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

run http server at port 8888

  $ lsc server
  
  Express server listening on port 8888

restful api 
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
