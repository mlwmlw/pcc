import React from 'react'
import Head from 'next/head'
import "../web/assets/lib/bootstrap/dist/css/bootstrap.min.css"
import "../web/assets/main.css"
import { ChakraProvider, useDisclosure } from "@chakra-ui/react"
import Header from '../components/header'
//import { useState, useEffect } from 'react'
const fetch = require('node-fetch');
import App from 'next/app'


// function useKeywords(){
//   const [keywords, setKeywords] = useState([])
//   useEffect(() => {
//     //fetch('https://pcc.mlwmlw.org/api/keywords')
//     if(keywords.length > 0) {
//       return;
//     }
//     fetch('/api/keywords')
//       .then(response => response.json())
//       .then(_keywords => {
//         setKeywords(_keywords)
//       });
//   }, [])
//   return keywords
// }
const getKeywords = async () => {
  const data = await fetch('https://pcc.mlwmlw.org/api/keywords')
  const keywords = await data.json();
  return keywords;
};


export default function MyApp({ Component, pageProps, keywords }) {
  
  return <>
    <Head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0,user-scalable=0" />
    </Head>
    <ChakraProvider>
      <Header keywords={keywords} />
      <Component {...pageProps} />
      <div className="footer">
          <div className="container">
              @{(new Date()).getFullYear()} 開放標案，本站所有資料僅供參考，資料來源請見 <a target="_blank" href="http://web.pcc.gov.tw/">http://web.pcc.gov.tw/</a>
          </div>
      </div>
    </ChakraProvider>
  </>
}
MyApp.getInitialProps = async (context) => {
  const ctx = await App.getInitialProps(context)
  const keywords = await getKeywords();
  return { ...ctx, keywords: keywords }

}
// export default class MyApp extends App {
//   static async getInitialProps({ Component, router, ctx }) {
//     let pageProps = {}

//     if (Component.getInitialProps) {
//       pageProps = await Component.getInitialProps(ctx)
//     }
// 		let keywords = await fetch("https://pcc.mlwmlw.org/api/keywords");
//     keywords = await keywords.json()

//     return { pageProps, keywords }
//   }

//   render () {
//     const { Component, pageProps } = this.props

//     return <>
//       <Head>
//         <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0,user-scalable=0" />
//       </Head>
//       <ChakraProvider>
// 				<Header keywords={this.props.keywords} />
//         <Component {...pageProps} />
// 				<div className="footer">
// 						<div className="container">
// 								@{(new Date()).getFullYear()} 開放標案，本站所有資料僅供參考，資料來源請見 <a target="_blank" href="http://web.pcc.gov.tw/">http://web.pcc.gov.tw/</a>
// 						</div>
// 				</div>
//       </ChakraProvider>
//     </>
//   }
// }
