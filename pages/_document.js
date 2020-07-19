// _document is only rendered on the server side and not on the client side
// Event handlers like onClick can't be added to this file

// ./pages/_document.js
import Document, { Head, Main, NextScript } from 'next/document'
const fetch = require("node-fetch");

export default class MyDocument extends Document {
  static async getInitialProps(ctx) {
    const initialProps = await Document.getInitialProps(ctx)
    let keywords = await fetch("http://pcc.mlwmlw.org/api/keywords");
    keywords = await keywords.json()
    return { keywords, ...initialProps }
  }

  render() {
    return (
      <html>
        <Head>
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
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
							(adsbygoogle = window.adsbygoogle || []).push({
								google_ad_client: "ca-pub-9215576480847196",
								enable_page_level_ads: true
							});
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
          <div className="navbar navbar-inverse navbar-fixed-top" role="navigation">
            <div className="container">
              <div className="navbar-header">
                  <button type="button" className="navbar-toggle" data-toggle="collapse" data-target=".navbar-collapse">
                    <span className="sr-only">Toggle navigation</span>
                    <span className="icon-bar"></span>
                    <span className="icon-bar"></span>
                    <span className="icon-bar"></span>
                  </button>
                  <a style={{color:"white"}} className="navbar-brand" href="/">開放標案</a>
              </div>
              <div className="collapse navbar-collapse">
                <ul className="nav navbar-nav">
                    <li className="dropdown"><a className="dropdown-toggle" href="javascript:void(0)">每日標案<span className="caret"></span></a>
                        <ul className="dropdown-menu" role="menu">
                            <li><a href="/month">依月份瀏覽</a></li>
                            <li><a href="/date/tender">招標</a></li>
                            <li><a href="/date/award">決標</a></li>
                        </ul>
                    </li>

                    <li className="dropdown"><a className="dropdown-toggle" href="javascript:void(0)">相關單位<span className="caret"></span></a>
                        <ul className="dropdown-menu" role="menu">
                            <li><a href="/units">機關組織檢索</a></li>
                            <li><a href="/merchants">廠商檢索</a></li>
                            <li><a href="/merchant_type">廠商檢索依營業類型</a></li>
                        </ul>
                    </li>
                    <li className="dropdown"><a className="dropdown-toggle" href="javascript:void(0)">統計<span className="caret"></span></a>
                        <ul className="dropdown-menu" role="menu">
                            <li><a href="/stats">各月招標統計</a></li>
                            <li><a href="/rank/merchant">得標廠商排行</a></li>
                            <li><a href="/rank/tender">高額標案排行</a></li>
                            <li><a href="/rank/partner">各單位得標廠商統計</a></li>
                            <li><a href="/election">2019 總統候選人 政治獻金查詢</a></li>
                        </ul>
                    </li>
                    <li className="dropdown"><a className="dropdown-toggle" href="javascript:void(0)">關於<span className="caret"></span></a>
                        <ul className="dropdown-menu" role="menu">
                            <li><a href="/hackpad">關於</a></li>
                            <li><a target="_blank" href="https://g0v.hackpad.com/LV55tyn5uYK">g0v</a></li>
                        </ul>
                    </li>
                </ul>

                <form className="navbar-form navbar-right" ng-submit="search(keyword)">
                    <input type="text" ng-model="keyword" className="form-control search" placeholder="標案搜尋（名稱、機構、廠商）" />
                    <button type="button" className="btn btn-primary">
                      <span className="glyphicon glyphicon-search"></span>
                    </button>
                </form>
                <div id="keywords" className="navbar-form navbar-right">
                    <span>熱門關鍵字：</span>
                    <ul>
                        {this.props.keywords.map( keyword => <li key={keyword}>
                          <a ng-click={"search('"+keyword+"')"} style={{cursor:"pointer"}}>{keyword}</a>
                        </li>)}
                    </ul>
                </div>
            </div>
                
            </div>
          </div>
          <div className="container">
            <Main />
          </div>
          <div className="footer">
              <div className="container">
                  @2018 開放標案，本站所有資料僅供參考，資料來源請見 <a target="_blank" href="http://web.pcc.gov.tw/">http://web.pcc.gov.tw/</a>
              </div>
          </div>
          <NextScript />
        </body>
      </html>
    )
  }
}
