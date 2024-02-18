const fetch = require('node-fetch');
import React from 'react'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import Head from 'next/head';

function useDay(year, month){
   const [day, setDay] = useState([])
   useEffect(() => {
     fetch(`/api/dates/?year=${year}&month=${month}`)
       .then(response => response.json())
       .then(_data => {
         setDay(_data.map((date) => {
            var day = dayjs(date)
            return {year: day.format('YYYY'), month: day.format('MM'), day: day.format('DD'), date: day.format('YYYY-MM-DD')}
         }))
       });
   }, [])
   return day
}

const getDay = async (year, month) => {
   const data = await fetch(`https://pcc.mlwmlw.org/api/dates?year=${year}&month=${month}`)
   const dates = await data.json();
   return Object.keys(dates).map((date) => {
      var day = dayjs(date)
      return {year: day.format('YYYY'), month: day.format('MM'), day: day.format('DD'), date: day.format('YYYY-MM-DD')}
   })
 };
 export const getServerSideProps = async (context) => {
   const { year, month } = context.query;
   const dates = await getDay(year, month)
   return {
     props: {dates}
   };
 };
 
 
export default function Page({dates}) {
   const router = useRouter()
   let desc = router.query.year + " 年 " + router.query.month + "月每日標案列表";
   return (
      <div className="container starter-template">
      <Head>
      <title>{router.query.year} 年 {router.query.month} 月標案 - 開放政府標案</title>
      <meta name="description"
      content={desc}/>
      <meta property="og:description"
      content={desc}/>
      </Head>
      <h1>{router.query.year} 年 {router.query.month} 月標案</h1>
         <ul>
         {dates.map(d => <li key={d.date}><a target="_blank" href={"/date/tender/" + d.date }>檢視 {d.date} 標案 </a></li> )}
         </ul>
      </div>
   )
}