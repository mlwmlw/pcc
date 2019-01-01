const routes = require('next-routes')

module.exports = routes()
.add('merchants')                     
.add('month')
.add('unit', '/unit/:unit', 'unit')
.add('dates', '/dates/:year/:month', 'dates')
.add('merchant', '/merchants/:id', 'merchant')