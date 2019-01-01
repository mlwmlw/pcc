const fetch = require("node-fetch");
import React from "react";


import { ResponsiveBar } from '@nivo/bar'

import ReactTable from "react-table";
import "react-table/react-table.css";
import ReactPaginate from 'react-paginate';
import Router from 'next/router'
import dayjs from 'dayjs'
import C3Chart from 'react-c3js';
import Head from 'next/head';
import 'c3/c3.css';
export default class extends React.Component {
   constructor(props) {
      super(props);      
      this.state = {year: null}
   }
  static async getInitialProps({ req, query, params }) {
    const res = await fetch("http://pcc.mlwmlw.org/api/merchant/" + encodeURIComponent(query.id));
    const data = await res.json()
    const years = ['全部'].concat(data.map(function(row) {
        var d = new Date(row.publish);
        return d.getFullYear()
    }).filter(function onlyUnique(value, index, self) {
        return self.indexOf(value) === index;
    }).sort().reverse());
    return { data, years, id: query.id };
  }
 
  changeYear(event) {
    this.setState({year: event.target.value});
  }
  getStats(data, units) {
    
    var stats = [];
    for (var year in units) {
      var row = units[year]
      row.year = year;
      stats.push(row);
    }
    stats.sort(function(a, b) {
        return b[1] - a[1];
    });
    return stats;
  }
  
  render() {
    let { data, years = []}= this.props;
    let year = this.state.year || years[1];

    
    var units = {};
    var desc = '近期得標案件：', title;
    for (var i in data) {
      if(i < 5)
        desc += dayjs(data[i].publish).format('YYYY-MM-DD') + " " + data[i].name + "、";
      for(var j in data[i].award.merchants) {
        if(data[i].award.merchants[j]._id == this.props.id || data[i].award.merchants[j].name == this.props.id)
          title = data[i].award.merchants[j].name + '得標案件';
      }
      var d = new Date(data[i].publish);
      //if (year != '全部' && year != d.getFullYear())
      //    continue;
      if (data[i].unit == null)
          continue;

      if (+data[i].price == 0)
          continue;
        var unit = data[i].unit.replace(/\s/g, '')
        if (!units[d.getFullYear()])
            units[d.getFullYear()] = {};
        if(!units[d.getFullYear()][unit])
          units[d.getFullYear()][unit] = 0;
        units[d.getFullYear()][unit] += +data[i].price;
    }
    
    let stats = this.getStats(data, units);
    
    /*
<div className="form-group">
            <label className="control-label">統計年份</label>
            <div>
                <select className="form-control" value={year} onChange={event => this.changeYear(event)}>
                {years.map((row, i) => <option key={row}>{row}</option>)}
                </select>
            </div>
        </div>
    */
   
    return (
      <div className="starter-template">
        <Head>
        <title>{title} - 開放政府標案</title>
        <meta property="og:description"
        content={desc}/>
        </Head>
        <h1>{title} 檢索 </h1>
        
        
        <div style={{width: "100%", height: "400px"}}>
        <ResponsiveBar data={stats/*.slice(0, 10).map(function(row, i) {
            return {
              id: row[0],
              label: row[0],
              value: row[1],
              index: i,
              year: "2018"
            }
          })*/}
          axisBottom={{
            "tickSize": 5,
            "tickPadding": 5,
            "tickRotation": 45,
            
            "legendPosition": "middle",
            "legendOffset": 32
          }}
          indexBy="year"
          keys={[].concat.apply([], Object.keys(units).map(function(i) {
            return Object.keys(units[i]);
          })).filter((v, i, a) => a.indexOf(v) === i) }
          margin={{
              "top": 30,
              "right": 120,
              "bottom": 100,
              "left": 0
          }}
          
          sortByValue={true}
          innerRadius={0.5}
          padAngle={0.7}
          cornerRadius={3}
          colors="paired"
          colorBy="id"
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
                "translateX": 120,
                "itemWidth": 120,
                "itemHeight": 14,
                "itemsSpacing": 2,
                "itemTextColor": "#999",
                "symbolSize": 14,
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
              accessor: "name"
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
                
                if(row._original.award.url) {
                  title = "決標公告";
                  url = row._original.url;
                }
                else {
                  let date = dayjs(row.publish).format('YYYYMMDD');
                  title = "招標公告";
                  url = `//web.pcc.gov.tw/prkms/prms-viewTenderDetailClient.do?ds=${date}&fn=${row.filename}.xml`
                }
                
                return <a target="_blank" href={url}>
                  {title}
                </a>
              }
            }
          ]}
         
          
          
          defaultPageSize={100}
          pageSizeOptions={[100, 500]}
          className="-striped -highlight"
        />
        
        
      </div>
    );
  }
}
