import React from 'react'
import App, {useState, useEffect} from 'next/app'
import Head from 'next/head'
import "../web/assets/lib/bootstrap/dist/css/bootstrap.min.css"
import "../web/assets/main.css"
import { ChakraProvider, useDisclosure } from "@chakra-ui/react"
import Header from './header'

export default class MyApp extends App {
  static async getInitialProps({ Component, router, ctx }) {
    let pageProps = {}

    if (Component.getInitialProps) {
      pageProps = await Component.getInitialProps(ctx)
    }
		let keywords = await fetch("https://pcc.mlwmlw.org/api/keywords");
    keywords = await keywords.json()

    return { pageProps, keywords }
  }

  render () {
    const { Component, pageProps } = this.props

    return <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0,user-scalable=0" />
      </Head>
      <ChakraProvider>
				<Header keywords={this.props.keywords} />
				<div className="container">
					<Component {...pageProps} />
				</div>
				<div className="footer">
						<div className="container">
								@2018 開放標案，本站所有資料僅供參考，資料來源請見 <a target="_blank" href="http://web.pcc.gov.tw/">http://web.pcc.gov.tw/</a>
						</div>
				</div>
      </ChakraProvider>
    </>
  }
}
