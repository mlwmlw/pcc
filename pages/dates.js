const fetch = require('node-fetch');
import React from 'react'
import dayjs from 'dayjs'
import Head from 'next/head';
export default class extends React.Component {
   static async getInitialProps({ req, query }) {
      const res = await fetch(`http://pcc.mlwmlw.org/api/dates/?year=${query.year}&month=${query.month}`);
      let json = await res.json();
      
      for(var i in json) {
         var day = dayjs(json[i])
         json[i] = {year: day.format('YYYY'), month: day.format('MM'), day: day.format('DD'), date: day.format('YYYY-MM-DD')}
      }
      return { dates: json, year: query.year, month: query.month }
   }
 
   render() {
     let desc = this.props.year + " 年 " + this.props.month + "月每日標案列表";
     return (
        
        <div className="starter-template">
         <Head>
         <title>{this.props.year} 年 {this.props.month} 月標案 - 開放政府標案</title>
         <meta property="og:description"
         content={desc}/>
         </Head>
         <h1>{this.props.year} 年 {this.props.month} 月標案</h1>
          <ul>
          {this.props.dates.map(d => <li key={d.date}><a target="_blank" href={"/date/tender/" + d.date }>檢視 {d.date} 標案 </a></li> )}
          </ul>
       </div>
     )
   }
 }
