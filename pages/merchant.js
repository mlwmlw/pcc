const fetch = require("node-fetch");
import React from "react";


import { ResponsivePie } from '@nivo/pie'
import { ResponsiveLine } from '@nivo/line'
import Router from 'next/router'
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
  static async getInitialProps({ req, query, params, res}) {
    const merchant_res = await fetch("http://pcc.mlwmlw.org/api/merchant/" + encodeURIComponent(query.id));
    const merchant = await merchant_res.json()
    const lookalike = await fetch("http://pcc.mlwmlw.org/api/lookalike/" + encodeURIComponent(query.id));
    const merchants = await lookalike.json()

    if( typeof(window) === 'undefined' && merchant._id && merchant._id != query.id) {
      res.redirect('/merchants/' + merchant._id);
    }

    const years = ['全部'].concat(merchant.tenders.map(function(row) {
        var d = new Date(row.publish);
        return d.getFullYear()
    }).filter(function onlyUnique(value, index, self) {
        return self.indexOf(value) === index;
    }).sort().reverse());
    return { merchant, years, id: query.id, merchants };
  }
 
  changeYear(event) {
    this.setState({year: event.target.value});
  }
	componentDidMount() {
		var merchant = this.props.merchant;
		if(!merchant) {
			return
		}
		$.post('/api/pageview/merchant/' + merchant._id)	
	}
  
  render() {
    let { merchant, years = [], merchants }= this.props;
    let year = this.state.year || years[1];
   	let currentYear = new Date().getFullYear(); 
  
    var desc = '近期得標案件：';
		var title = currentYear + '年 ' + merchant.name + '得標案件';
		
    for (var i in merchant.tenders) {
      if(i < 5)
        desc += dayjs(merchant.tenders[i].publish).format('YYYY-MM-DD') + " " + merchant.tenders[i].name + "、";
    }
    let stats = merchant.tenders.reduce(function(total, row) {
      if(!row.parent_unit) {
        return total;
			}
      var unit = row.parent_unit.name.replace(/\s/g, '')
      if(!total[unit])
        total[unit] = 0;
      total[unit] += +row.price;
      return total;
    }, {});
    
    let line_data = merchant.tenders.reduce(function(total, row) {
      
      var d = new Date(row.publish);
      if(!row.publish) {
        return total;
      } 
      if(!total[d.getFullYear()]) {
        total[d.getFullYear()] = 0;
      }
      total[d.getFullYear()] += +row.price;
      return total;
    }, {});
    
    stats = Object.keys(stats).map((key) => {
      return {
        id: key,
        label: key,
        value: stats[key]
      }
    })
    
    let line = [{
      id: "spend", 
      data: Object.keys(line_data).map(function(key) {
        return {
          x: key,
          y: line_data[key]
        }
      })
    }]
    
    return (
      <div className="container starter-template">
        <Head>
        <title>{title} - 開放政府標案</title>
        <meta name="description"
        content={desc}/>
        <meta property="og:description"
        content={desc}/>
        </Head>
        <h1>{currentYear}年{merchant.name}得標案件</h1>
        <span>公司統一編號：{merchant._id}</span><br />
        <a href={"https://company.g0v.ronny.tw/index/search?q=" + merchant._id} target="_blank">查看公司資料</a>
        <div style={{width: "100%", height: line[0].data.length > 1 ? "400px": 0}}>
          {chart(line)}
        </div>
        <div style={{width: "100%", height: stats.length > 1 ? "400px": 0}}>
        <ResponsivePie data={stats}
          axisBottom={{
            "tickSize": 5,
            "tickPadding": 5,
            "tickRotation": 45,
            
            "legendPosition": "middle",
            "legendOffset": 32
          }}
          indexBy="year"
          
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
      	<ins className="adsbygoogle"
					 style={{"display":"block", "height": "150px"}}
					 data-ad-client="ca-pub-9215576480847196"
					 data-ad-slot="1304930582"
					 data-ad-format="auto"
					 data-full-width-responsive="true"></ins>  
				<h3>相關得標案件</h3>
        <ReactTable
          data={merchant.tenders}
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
              Header: "類型",
              accessor: "type",
              Cell: ({row}) => {
                return row.type ? row.type.replace(/\(.+\)公告/, ''): null
              }
            },
            {
              Header: "標案金額",
              accessor: "price",
              align: 'right',
              Cell: ({row}) => {
                return <div style={{textAlign: 'right'}}>{new Intl.NumberFormat('zh-TW').format(row.price)}</div>;
              }
            },
            {
              Header: "招標日期",
              accessor: "publish",
              Cell: ({row}) => {
                let date = dayjs(row.publish).format('YYYY-MM-DD');
                return date;
              }
            },
						{
              Header: "決標日期",
              accessor: "end_date",
              Cell: ({row}) => {
                let date = dayjs(row.end_date).format('YYYY-MM-DD');
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
         
          
          
          defaultPageSize={Math.min(100, merchant.tenders.length)}
          pageSizeOptions={[100, 500]}
          className="-striped -highlight"
        />
				<h3>查看更多相似廠商</h3>
 				<ReactTable
          data={merchants}
          columns={[
            {
              Header: "廠商名稱",
              accessor: "name"
            },
						{
              Header: "相關標案",
              accessor: "_id",
              Cell: ({ row }) => {
                return <a href={"/merchants/" + row._id}>
									查看相關標案
                </a>
              }
            },
           ]} 
          defaultPageSize={Math.min(30, merchants.length)}
          pageSizeOptions={[100, 500]}
          className="-striped -highlight"
        />       
				
      </div>
			
    );
  }
}
