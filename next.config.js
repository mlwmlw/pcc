//const withPlugins = require("next-compose-plugins");
//const withCSS = require('@zeit/next-css')
// module.exports = withPlugins([withCSS], {
//   reactStrictMode: true,
// });

// module.exports = withCSS({
   
//   webpack: config => {
//    /*config.module.rules.push({
//      test: /\.(png|svg|jpg|gif)$/,
//      use: ["file-loader"]
//    });*/
//    config.module.rules.push({
//        test: /\.(jpg|png|woff|woff2|eot|ttf|svg)$/, 
//       //loader: 'url-loader?limit=100000' 
//    })
//    config.module.rules.push({
//       test: /\.css$/i,
//       use: ['style-loader', 'css-loader'],
//    });
//    return config;
   
//  },
//  transpilePackages: ["@nivo"], 
//   experimental: { esmExternals: "loose" }
// })

module.exports = {
    async rewrites() {
        return [
        {
            source: '/api/:path*',
            destination: 'http://localhost:8888/:path*' // Proxy to Backend
        },
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
        // {
        //     source: '/keyword/:keyword*',
        //     destination: '/search/?keyword=:keyword*' // Proxy to Backend
        // }
        ]
    }
}