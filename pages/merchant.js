const fetch = require("node-fetch");
import React from "react";
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
      this.state = {year: "全部"}
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
  render() {
    let { data, years = []}= this.props;
    let year = this.state.year;
    var units = {};
    const c3 = {
      data: {
        columns: [],
        type: 'pie',
      },
      legend: {
        position: 'right'
     }
   };
  var desc = '近期得標案件：', title;
  for (var i in data) {
    if(i < 5)
      desc += dayjs(data[i].publish).format('YYYY-MM-DD') + " " + data[i].name + "、";
    for(var j in data[i].award.merchants) {
      if(data[i].award.merchants[j]._id == this.props.id || data[i].award.merchants[j].name == this.props.id)
        title = data[i].award.merchants[j].name + '得標案件';
    }
    var d = new Date(data[i].publish);
    if (year != '全部' && year != d.getFullYear())
        continue;
    if (data[i].unit == null)
        continue;

    if (+data[i].price == 0)
        continue;
    var unit = data[i].unit.replace(/\s/g, '')
    if (!units[unit])
        units[unit] = 0;
    units[unit] += +data[i].price;
  }

    var stats = [];
    for (var i in units) {
        stats.push([i, units[i]]);
    }
    stats.sort(function(a, b) {
        return b[1] - a[1];
    });
    c3.data.columns = stats.slice(0, 30)

    return (
      <div className="starter-template">
        <Head>
        <title>{title} - 開放政府標案</title>
        <meta property="og:description"
        content={desc}/>
        </Head>
        <h1>{title} 檢索 </h1>
        <div className="form-group">
            <label className="control-label">統計年份</label>
            <div>
                <select className="form-control" onChange={event => this.changeYear(event)}>
                {years.map(row => <option key={row}>{row}</option>)}
                </select>
            </div>
        </div>

        <C3Chart unloadBeforeLoad {...c3} />
        <ReactTable
          data={data}
          columns={[
            {
              Header: "單位",
              accessor: "unit"
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
                  url = row._original.award.url;
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
         
          
          
          
          pageSizeOptions={[500]}
          className="-striped -highlight"
        />
        
        
      </div>
    );
  }
}
