const withCSS = require('@zeit/next-css')
module.exports = withCSS({
   
  webpack(config) {
   /*config.module.rules.push({
     test: /\.(png|svg|jpg|gif)$/,
     use: ["file-loader"]
   });*/
   config.module.rules.push({
       test: /\.(jpg|png|woff|woff2|eot|ttf|svg)$/, 
      loader: 'url-loader?limit=100000' 
   })
   return config;
   
 }

})
