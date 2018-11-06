const routes = require('next-routes')

module.exports = routes()
.add('merchants')                     
.add('month')                         
.add('merchant', '/merchants/:id', 'merchant')