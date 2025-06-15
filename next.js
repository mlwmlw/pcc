const next = require('next');
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = express();

  // 靜態資源
  server.use('/static', express.static('web/assets'));

  // API 代理
  server.use('/api', (req, res, next) => {
    if (req.url.startsWith('/og-image')) {
      // 不要 proxy，交給下一個 middleware 或 route handler
      return next();
    }

    // 其他 /api/* 都 proxy
    return createProxyMiddleware({
      target: "http://localhost:8888/",
      changeOrigin: true,
      pathRewrite: {
        '^/api': '',
      },
    })(req, res, next);
  });

  // 處理所有請求
  server.all('*', (req, res) => {
    return handle(req, res);
  });

  const port = process.env.PORT || 8890;
  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`);
  });
});