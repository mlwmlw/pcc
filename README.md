pcc.gXv.tw
===
demo: http://pcc.mlwmlw.org/
api: http://pcc.mlwmlw.org/api

usage
===
get and parse pcc data

  $ lsc main 2014-06-19

run http server at port 8888

  $ lsc server
  
  Express server listening on port 8888

restful api 
===
get http://127.0.0.1:8888/page/:page
  
EX: http://pcc.mlwmlw.org/api/page/1

get http://127.0.0.1:8888/keyword/:keyword

EX: http://pcc.mlwmlw.org/api/keyword/陸軍

get http://127.0.0.1:8888/categories

EX: http://pcc.mlwmlw.org/api/categories

get http://127.0.0.1:8888/category/:category

EX: http://pcc.mlwmlw.org/api/category/工程類

get http://127.0.0.1:8888/date/:date

EX: http://pcc.mlwmlw.org/api/date/2014-08-05
