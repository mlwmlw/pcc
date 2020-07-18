const fetch = require("node-fetch");
import React from "react";

import { ResponsiveBar } from '@nivo/bar'
import { ResponsivePie } from '@nivo/pie'
import { ResponsiveLine } from '@nivo/line'

import ReactTable from "react-table";
import "react-table/react-table.css";
import dayjs from 'dayjs'
import Head from 'next/head';
import 'c3/c3.css';
function chart(data) {
  
  return (
    <ResponsiveLine
      data={data}
      margin={{
        top: 30,
        right: 50,
        bottom: 50,
        left: 100
      }}
      yScale={{
        type: "linear",
      }}
      axisLeft={{ format: v => new Intl.NumberFormat('zh-TW', { notation: "compact" }).format(v) }}
      
      
      xScale={{
        type: "point",
        //precision: "year",
        //format: "%Y"
        //format: "native"
      }}
      axisBottom={{
        //format: "%Y"
      }}
    />
  );
}

export default class extends React.Component {
   constructor(props) {
      super(props);      
      this.state = {year: null}
   }
  static async getInitialProps({ req, query, params }) {
    const res = await fetch("http://pcc.mlwmlw.org/api/election");
    const election = await res.json()
    return { election };
  }
 
  
 
  
  render() {
    let { election }= this.props;
   
    var desc = '查詢各候選人收入/支出金額與相關組織標案查詢';
    var title = '2019 總統候選人 政治獻金查詢';
    
    
    return (
      <div className="starter-template">
        <Head>
        <title>{title} - 開放政府標案</title>
        <meta name="description"
        content={desc}/>
        <meta property="og:description"
        content={desc}/>
        </Head>
        
        <div>
				<h3>{title}</h3>
            <ReactTable
               data={election}
               columns={[
                  {
                  Header: "候選人",
                  accessor: "candidate",
                  
                  },
                  {
                  Header: "日期",
                  accessor: "date"
                  },
                  {
                  Header: "捐獻者",
                  accessor: "donator",
                  Cell: ({row}) => {
                     return <a target="_blank" href={'/merchants/' + (row._original.unique_id) }>{row.donator}</a>
                  }
                  },
                  {
                  Header: "收入",
                  accessor: "income",
                  Cell: ({row}) => {
                     return <div style={{textAlign: 'right'}}>{new Intl.NumberFormat('zh-TW', { maximumSignificantDigits: 1 }).format(row.income)}</div>;
                  }
                  },
                  {
                     Header: "支出",
                     accessor: "expense",
                     Cell: ({row}) => {
                     return <div style={{textAlign: 'right'}}>{new Intl.NumberFormat('zh-TW', { maximumSignificantDigits: 1 }).format(row.expense)}</div>;
                     }
                  },
                  {
                     Header: "支出類型",
                     accessor: "expense_type",
                  }
               ]}

               defaultPageSize={Math.min(100, election.length)}
               pageSizeOptions={[1000, 2000]}
               className="-striped -highlight"
            />
         </div>         
      </div>
			
    );
  }
}
