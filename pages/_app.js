import React from 'react'
import App, { Container } from 'next/app'
import "../web/assets/lib/bootstrap/dist/css/bootstrap.min.css"
import "../web/assets/main.css"
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