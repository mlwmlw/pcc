// server.js
const next = require('next')
const routes = require('./routes')
const app = next({dev: process.env.NODE_ENV !== 'production'})
const handler = routes.getRequestHandler(app)
const { createProxyMiddleware } = require('http-proxy-middleware');

// With express
const express = require('express')
app.prepare().then(() => {
  var app = express()
  app.use('/static', express.static('web/assets'));
  app.use('/api', createProxyMiddleware({
    target: "http://localhost:8888/",
    changeOrigin: true,
    pathRewrite: {
        [`^/api`]: '',
    },
  }));
  app.use(handler).listen(process.env.PORT || 8890)
})


