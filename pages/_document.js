// _document is only rendered on the server side and not on the client side
// Event handlers like onClick can't be added to this file

// ./pages/_document.js
import Document, { Html, Head, Main, NextScript } from 'next/document'

const fetch = require("node-fetch");

export default class MyDocument extends Document {
  static async getInitialProps(ctx) {
    const initialProps = await Document.getInitialProps(ctx)
    return { ...initialProps }
  }

  render() {
    return (
      <Html>
        <Head>
        <script src="/static/lib/jquery/dist/jquery.min.js"></script>
        <script src="/static/lib/angular/angular.min.js"></script>
        <script src="/static/lib/react/react.min.js"></script>
        <script src="/static/lib/ngReactGrid/build/js/ngReactGrid.min.js"></script>
        <script src="/static/lib/angular-route/angular-route.min.js"></script>
        <script src="/static/lib/bootstrap/dist/js/bootstrap.min.js"></script>
        <script src="/static/lib/angular-bootstrap/ui-bootstrap-tpls.min.js"></script>
        <script src="/static/lib/d3/d3.min.js"></script>
        <script src="/static/lib/c3/c3.js"></script>
        <script src="/static/lib/angular-loading-bar/build/loading-bar.min.js"></script>
        <script src="/static/app.js"></script>
				<script async src="//pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script>
				<script
            dangerouslySetInnerHTML={{
							__html: `
							(adsbygoogle = window.adsbygoogle || []).push({});
						 `}}>
				</script>
        <script
            dangerouslySetInnerHTML={{
            __html: `
            (function(i, s, o, g, r, a, m) {
                  i['GoogleAnalyticsObject'] = r;
                  i[r] = i[r] || function() {
                     (i[r].q = i[r].q || []).push(arguments)
                  }, i[r].l = 1 * new Date();
                  a = s.createElement(o),
                     m = s.getElementsByTagName(o)[0];
                  a.async = 1;
                  a.src = g;
                  m.parentNode.insertBefore(a, m)
            })(window, document, 'script', '//www.google-analytics.com/analytics.js', 'ga');

            ga('create', 'UA-56091287-1', 'auto');
            ga('send', 'pageview');
          `}}>
         </script>
         
        </Head>
        <body  ng-app="myapp" ng-controller="page" className="adaw">
					<Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}
