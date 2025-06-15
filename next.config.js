// next.config.js
module.exports = {
    // 保留您現有的 rewrites 設定
    async rewrites() {
        return [
        {
            source: '/api/:path*',
            destination: 'http://localhost:8888/:path*' // Proxy to Backend
        },
        // {
        //     source: '/api/:path*',
        //     destination: 'http://localhost:8888/:path*' // Proxy to Backend
        // },
        {
            source: '/static/:path*',
            destination: 'http://localhost:8889/assets/:path*' // Proxy to Backend
        },
        {
            source: '/date/tender',
            destination: `/date/tender/0`, // Proxy to Backend
        },
        {
            source: '/date/award',
            destination: `/date/award/0`,
        },
        {
            source: '/units',
            destination: `/units/0`,
        },
        {
            source: '/stats/:unit*',
            destination: `/stats`,
        },
        // {
        //     source: '/keyword/:keyword*',
        //     destination: '/search/?keyword=:keyword*' // Proxy to Backend
        // }
        ];
    },

    // 加入或修改以下配置
    reactStrictMode: true, // 建議開啟 React嚴格模式 (如果尚未開啟)
    experimental: {
        esmExternals: "loose", // 這個選項有助於處理 ESM 依賴
    },
    transpilePackages: [
        // Nivo 相關套件
        '@nivo/core',
        '@nivo/pie',       // 用於 pages/stats.js
        '@nivo/bar',       // 用於 pages/rank/merchant.js
        '@nivo/line',      // 用於 pages/stats.js (如果未來加入趨勢圖)
        '@nivo/legends',   // 錯誤訊息中提及
        '@nivo/tooltip',   // 常見的 Nivo 依賴
        '@nivo/axes',      // 常見的 Nivo 依賴 (例如長條圖和折線圖)
        '@nivo/scales',    // 常見的 Nivo 依賴

        // D3 相關套件 (從錯誤訊息和常見 Nivo 依賴推斷)
        'd3-scale',        // 錯誤訊息中明確提及
        'd3-shape',
        'd3-array',
        'd3-color',
        'd3-format',
        'd3-interpolate',
        'd3-path',
        'd3-time',
        'd3-time-format',
        // 如果還有其他 d3 套件引起問題，可以陸續加入
    ],
    // 如果您有特定的 webpack 配置需求，可以保留或調整 webpack 部分
    // webpack: (config, { isServer }) => {
    //   // 您的自訂 webpack 配置
    //   return config;
    // },
};
