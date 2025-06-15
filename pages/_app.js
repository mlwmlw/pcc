import React from 'react'
import Head from 'next/head'
import "../web/assets/main.css"
import "./globals.css"

import { ChakraProvider } from "@chakra-ui/react"
import {NextUIProvider} from "@nextui-org/react";
import { getApiUrl } from "../utils/api";

import Header from '../components/header'
//import { useState, useEffect } from 'react'
import fetch from 'node-fetch'
import App from 'next/app'

export default function MyApp({ Component, pageProps }) {
  
  return <>
    <Head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0,user-scalable=0" />
    </Head>
    <NextUIProvider>
    <ChakraProvider>
    
      <Header />
      
      <Component {...pageProps} />
      <div className="footer">
          <div className="container">
              @{(new Date()).getFullYear()} 開放標案，本站所有資料僅供參考，資料來源請見 <a target="_blank" href="https://web.pcc.gov.tw/">https://web.pcc.gov.tw/</a>
          </div>
      </div>
    </ChakraProvider>
    </NextUIProvider>
  </>
}
