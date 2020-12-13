const fetch = require("node-fetch");
import React from "react";

import { ResponsiveBar } from '@nivo/bar'

import ReactTable from "react-table";
import "react-table/react-table.css";
import dayjs from 'dayjs'
import Head from 'next/head';
import 'c3/c3.css';
Number.prototype.format = function(n, x, s, c) {
  var re = '\\d(?=(\\d{' + (x || 3) + '})+' + (n > 0 ? '\\D' : '$') + ')',
      num = this.toFixed(Math.max(0, ~~n));

  return (c ? num.replace('.', c) : num).replace(new RegExp(re, 'g'), '$&' + (s || ','));
};

export default class extends React.Component {
   constructor(props) {
      super(props);      
      this.state = {year: null}
   }
  static async getInitialProps({ req, query, params }) {
    const unit_res = await fetch("http://pcc.mlwmlw.org/api/unit_info/" + encodeURIComponent(query.unit));
    const unit = await unit_res.json()
    const res = await fetch("http://pcc.mlwmlw.org/api/unit/" + encodeURIComponent(query.unit));
    const data = await res.json()
		const lookalike = await fetch("http://pcc.mlwmlw.org/api/unit_lookalike/" + encodeURIComponent(query.unit));
    const lookalike_units = await lookalike.json()

  
    let units = {}
    for(var i in data) {
      if(!data[i].award)
        continue;
      for(var j in data[i].award.merchants) {
        var merchant = data[i].award.merchants[j];
        if(!units[merchant.name])
          units[merchant.name] = 0;
        units[merchant.name] += merchant.amount
      }
    }
    var stats = [];
    var inc = 0;
    for (var i in units) {
      
        stats.push({
          index: inc++,
          name: i,
          price: units[i]
        });
    }
    stats.sort(function(a, b) {
        return b.price - a.price;
    });
    
    return { stats: stats.slice(0, 13), data, unit: unit, lookalike_units: lookalike_units };
  }
 
  render() {
    let { data, unit, stats, lookalike_units}= this.props;
    let title = unit.name + '標案檢索'
    let desc = unit.name + " 最新標案 ";
    data.slice(0, 5).map(function(row) {  
      desc += dayjs(row.publish).format('YYYY-MM-DD') + " " + row.name;
      if(row.price)
        desc += " 金額 $" + row.price.format(0, 3, ',') 
      desc += "、";
    })
    let more = [];
    if(unit.parent && unit.parent.name)
      more = [
        <span key={1}>查詢更多</span>,
        <span key={2}> </span>,
        <a key={3} href={"/unit/" + unit.parent.name}>{unit.parent.name}相關標案</a>, 
        <span key={4}> </span>,
        <a key={5} href={"/units/" + unit.parent._id}>{unit.parent.name}相關機關</a>,
        <span key={6}> </span>
      ]
    if(unit.childs && unit.childs.length > 0)
      more.push(<a key={7} href={"/units/" + unit._id}>{unit.name}子機關</a>)
    return (
      <div className="starter-template">
        <Head>
        <title>{title} - 開放政府標案</title>
				<meta name="description"
        content={desc}/>

        <meta property="og:description"
        content={desc}/>
        </Head>
        <h1>{title}</h1>
        <h3>{more}</h3>
        <b>累積得標金額廠商排行</b>
        <div style={{width: "100%", height: "400px"}}>
        <ResponsiveBar data={stats}

          axisBottom={{
            "tickSize": 5,
            "tickPadding": 5,
            "tickRotation": 45,
            
            "legendPosition": "middle",
            "legendOffset": 32
          }}
          indexBy="name"
          keys={["price"]}
          margin={{
              "top": 30,
              "right": 200,
              "bottom": 150,
              "left": 0
          }}
          enableLabel={false}
          sortByValue={true}
          innerRadius={0.5}
          padAngle={0.7}
          cornerRadius={3}
          colors="paired"
          colorBy="index"
          borderWidth={1}
          borderColor="inherit:darker(0.2)"
          animate={true}
          motionStiffness={90}
          motionDamping={15}
          
          legends={[
            {
                "dataFrom": "indexes",
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
 				<h3>相關標案</h3>
        <ReactTable
          data={data}
          columns={[
            {
              Header: "單位",
              accessor: "unit",
              Cell: ({ row }) => {
                return <a href={"/unit/" + row.unit}>
                  {row.unit}
                </a>
              }
            },
            {
              Header: "標案名稱",
              accessor: "name",
							Cell: ({ row }) => { 
								let url = ''
                url = `/tender/${row.unit}/${row._original.job_number}`
                return <a target="_blank" href={url}>
                  {row.name}
                </a>
              }
            },
            {
              Header: "標案金額",
              accessor: "price"
            },
            {
              Header: "招標/決標日期",
              accessor: "publish",
              Cell: ({row}) => {
                let date = dayjs(row.publish).format('YYYY-MM-DD');
                return date;
              }
            },
            {
              Header: "得標廠商",
              accessor: "award",
              Cell: ({row}) => {
                var merchants = row.award && row.award.merchants ;
                
                if (typeof merchants)
                    if (merchants && Object.keys(merchants).length) {
                        var $merchants = [];
                        Object.keys(merchants).map(function(k) {
                            var m = merchants[k];
                            $merchants.push(
                                <li key={k}><a href={'/merchants/' + (m._id || m.name) }>{m.name}</a></li>
                            );
                        });
                        return <ul>{$merchants}</ul>
                    } else if (merchants && merchants.length == 0) {
                    return '無法決標';
                } else {
                    return '';
                }
              }
            },
            {
              Header: "原始公告",
              accessor: "filename",
              filterable: false,
              Cell: ({ row }) => {                
                let title = '', url = '';
                let date = dayjs(row.publish).format('YYYYMMDD');
                title = "招標公告";
                url = `//web.pcc.gov.tw/prkms/prms-viewTenderDetailClient.do?ds=${date}&fn=${row.filename}.xml`
                return <a target="_blank" href={url}>
                  {title}
                </a>
              }
            }
          ]}
         
          defaultPageSize={Math.min(100, data.length)}
          pageSizeOptions={[100, 500]}
          className="-striped -highlight"
        />
        
 				<h3>相似單位</h3>
 				<ReactTable
          data={lookalike_units}
          columns={[
            {
              Header: "單位",
              accessor: "_id"
            },
						{
              Header: "相關標案",
              accessor: "_id",
              Cell: ({ row }) => {
                return <a href={"/unit/" + row._id}>
									查看相關標案
                </a>
              }
            },
           ]} 
          
          defaultPageSize={Math.min(30, lookalike_units.length)}
          pageSizeOptions={[100, 500]}
          className="-striped -highlight"
        />       
        
       
      </div>
    );
  }
}
