const fetch = require('node-fetch');
import { useRouter } from 'next/router'
import { getApiUrl } from '../../../utils/api';
import dayjs from 'dayjs'
import Head from 'next/head';


const getDay = async (year, month) => {
   const data = await fetch(getApiUrl(`/dates?year=${year}&month=${month}`))
   const dates = await data.json();
   
   return dates.map((date) => {
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
      <div className="min-w-6xl max-w-screen-lg px-4 mx-auto">
      <div className="container starter-template ">
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
      </div>
   )
}
