
import React from "react";
import fetch from "node-fetch";
import dynamic from 'next/dynamic';
import { getApiUrl } from '../utils/api';

import { DataTable } from "../components/DataTable";
import Head from 'next/head';

export default class extends React.Component {
   constructor(props) {
      super(props);      
      this.state = {year: null}
   }
  static async getInitialProps({ req, query, params }) {
    const res = await fetch(getApiUrl('/election'));
    const election = await res.json();
    var mapping = {};
    var stats = [];
    var keys = []
    for (var i in election) {
      if(!mapping[election[i].candidate]) {
        mapping[election[i].candidate] = {name: election[i].candidate}
      }
      if(!mapping[election[i].candidate][election[i].donator]) {
        mapping[election[i].candidate][election[i].donator] = 0;
      }
      mapping[election[i].candidate][election[i].donator] += election[i].expense;
    }
    for(var i in mapping) {
      stats.push(mapping[i]);
      var keysSorted = Object.keys(mapping[i]).sort(function(a,b){return mapping[i][b]-mapping[i][a]})
      keys = keys.concat(keysSorted.slice(1, 10));
    }
    stats = stats.slice(0, 3);
    return { election, stats, keys };
  }
  chart(stats, keys) {
    const ResponsiveBar = dynamic(() => {
        return import('@nivo/bar').then((mod) => mod.ResponsiveBar)
    }, { ssr: false })

    return <div style={{width: "100%", height: "400px"}}>
      <ResponsiveBar data={stats}
  
        axisBottom={{
          "tickSize": 5,
          "tickPadding": 5,
          "tickRotation": 45,
          
          "legendPosition": "middle",
          "legendOffset": 32
        }}
        onClick={(node, event) => this.setState({filter: node.id})}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: '支出金額',
          legendPosition: 'middle',
          legendOffset: -40,
          format: v => new Intl.NumberFormat('zh-TW').format(v/100000000) + "億"
        }}
        
        indexBy="name"
        keys={keys}
        margin={{
            "top": 30,
            "right": 200,
            "bottom": 150,
            "left": 60
        }}
        enableLabel={false}
        sortByValue={true}
        innerRadius={0.5}
        padAngle={0.7}
        cornerRadius={3}
  
        colors={{scheme: "paired"}}
  
        borderWidth={1}
        borderColor="inherit:darker(0.2)"
        animate={true}
        motionStiffness={90}
        motionDamping={15}
        
        legends={[
          {
              "dataFrom": "keys",
              "anchor": "bottom-right",
              "direction": "column",
              "translateX": 150,
              "itemWidth": 140,
              "itemHeight": 16,
              "itemsSpacing": 2,
              "itemTextColor": "#666",
              "symbolSize": 15,
              "symbolShape": "circle",
              "effects": [
                  {
                      "on": "hover",
                      "style": {
                          "itemTextColor": "#000"
                      }
                  }
              ]
          }
        ]}
      />
    </div>
  }
  
 
  
  render() {
    let { election, stats, keys }= this.props;
    let {filter} = this.state;
    let data = election.filter(v => {
      return filter ? v.donator == filter: true;
    })
    var desc = '查詢各候選人收入/支出金額與相關組織標案查詢';
    var title = '2019 總統候選人 政治獻金查詢';

    return (
      <div className="min-w-6xl max-w-screen-lg px-4 mx-auto">
      <div className="container starter-template">
        <Head>
        <title>{title} - 開放政府標案</title>
        <meta name="description"
        content={desc}/>
        <meta property="og:description"
        content={desc}/>
        </Head>
        
        <div>
          <h3>{title}</h3>
          <h4>各候選人前十大支出廠商</h4>
          {this.chart(stats, keys, 'expense')}
          <h4>非個人支出/收入明細</h4>
            <DataTable
                data={data}
                columns={[
                  {
                    header: "候選人",
                    accessorKey: "candidate",
                  },
                  {
                    header: "日期",
                    accessorKey: "date"
                  },
                  {
                    header: "捐獻者",
                    accessorKey: "donator",
                    cell: ({row}) => {
                      return <a target="_blank" href={'/merchants/' + (row.original.unique_id) }>{row.original.donator}</a>
                    }
                  },
                  {
                    header: "收入",
                    accessorKey: "income",
                    cell: ({row}) => {
                      return <div style={{textAlign: 'right'}}>{new Intl.NumberFormat('zh-TW').format(row.original.income)}</div>;
                    }
                  },
                  {
                    header: "支出",
                    accessorKey: "expense",
                     cell: ({row}) => {
                      return <div style={{textAlign: 'right'}}>{new Intl.NumberFormat('zh-TW').format(row.original.expense)}</div>;
                     }
                  },
                  {
                    header: "支出類型",
                    accessorKey: "expense_type",
                  }
               ]}

           
            />
         </div>         
      </div>
      </div>
    );
  }
}
