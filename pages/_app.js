import React from 'react'
import Head from 'next/head'
import "../web/assets/main.css"
import "./globals.css"

import { ChakraProvider } from "@chakra-ui/react"
import {NextUIProvider} from "@nextui-org/react";

import Header from '../components/header'
//import { useState, useEffect } from 'react'
import fetch from 'node-fetch'
import App from 'next/app'


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
    <NextUIProvider>
    <ChakraProvider>
    
      <Header keywords={keywords} />
      
      <Component {...pageProps} />
      <div className="footer">
          <div className="container">
              @{(new Date()).getFullYear()} 開放標案，本站所有資料僅供參考，資料來源請見 <a target="_blank" href="https://web.pcc.gov.tw/">http://web.pcc.gov.tw/</a>
          </div>
      </div>
    </ChakraProvider>
    </NextUIProvider>
  </>
}
MyApp.getInitialProps = async (context) => {
  const ctx = await App.getInitialProps(context)
  const keywords = await getKeywords();
  return { ...ctx, keywords: keywords }

}
