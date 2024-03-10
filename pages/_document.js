// _document is only rendered on the server side and not on the client side
// Event handlers like onClick can't be added to this file

// ./pages/_document.js
import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
    return (
      <Html className="text-[15px]">
        <Head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="stylesheet" href="/_next/static/style.css" />
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
               __html: `setTimeout(function(){ (adsbygoogle = window.adsbygoogle || []).push({}); }, 2000);`
            }}>
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
        <body ng-app="myapp" ng-controller="page" className="pt-0">
          <Main />
          <NextScript />
        </body>
      </Html>
    )
}
