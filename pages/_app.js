import React from 'react'
import App, { Container } from 'next/app'
import "../web/assets/lib/bootstrap/dist/css/bootstrap.min.css"
import "../web/assets/main.css"
//import "../web/assets/lib/jquery/dist/jquery.min.js"
/*<script src="/assets/lib/angular/angular.min.js"></script>
<script src="/assets/lib/react/react.min.js"></script>
<script src="/assets/lib/ngReactGrid/build/js/ngReactGrid.min.js"></script>
<script src="/assets/lib/angular-route/angular-route.min.js"></script>
<script src="/assets/lib/bootstrap/dist/js/bootstrap.min.js"></script>
<script src="/assets/lib/angular-bootstrap/ui-bootstrap-tpls.min.js"></script>
<script src="/assets/lib/d3/d3.min.js"></script>
<script src="/assets/lib/c3/c3.js"></script>
<script src="/assets/lib/angular-loading-bar/build/loading-bar.min.js"></script>*/
export default class MyApp extends App {
  static async getInitialProps({ Component, router, ctx }) {
    let pageProps = {}

    if (Component.getInitialProps) {
      pageProps = await Component.getInitialProps(ctx)
    }

    return { pageProps }
  }

  render () {
    const { Component, pageProps } = this.props

    return (
      <Container>
        <Component {...pageProps} />
      </Container>
    )
  }
}