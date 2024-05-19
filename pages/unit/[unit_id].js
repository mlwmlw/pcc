const fetch = require("node-fetch");
import React from "react";
import dynamic from 'next/dynamic';
import dayjs from 'dayjs'
import Head from 'next/head';
import { DataTable } from '../../components/DataTable';
import { useEffect } from 'react';
Number.prototype.format = function(n, x, s, c) {
  var re = '\\d(?=(\\d{' + (x || 3) + '})+' + (n > 0 ? '\\D' : '$') + ')',
      num = this.toFixed(Math.max(0, ~~n));

  return (c ? num.replace('.', c) : num).replace(new RegExp(re, 'g'), '$&' + (s || ','));
};
const getUnit = async (unit_id) => {
    unit_id = encodeURIComponent(unit_id);
    const unit_res = await fetch("https://pcc.mlwmlw.org/api/unit_info/" + unit_id);
    const unit = await unit_res.json()
    const res = await fetch("https://pcc.mlwmlw.org/api/unit/" + unit_id);
    const data = await res.json()
		const lookalike = await fetch("https://pcc.mlwmlw.org/api/unit_lookalike/" + unit_id);
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
};
export const getServerSideProps = async (context) => {
  const { unit_id } = context.query;
  const props = await getUnit(unit_id)
  return {
    props: props
  };
};
function Bar({ stats }) {
  const ResponsiveBar = dynamic(() => {
    return import('@nivo/bar').then((mod) => mod.ResponsiveBar)
  }, { ssr: false })
  return <ResponsiveBar data={stats}

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
    colors={{scheme: "paired"}}
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
}
function TenderTable({data}) {
  const columns = [
    {
      header: "單位",
      accessorKey: "unit",
      
      cell: ({row}) => {
        return <a href={"/unit/" + row.original.unit}>
          {row.original.unit}
        </a>
      }
    },
    {
      header: "標案名稱",
      filter: true,
      accessorKey: "name",
      wrapText: true,
      autoHeight: true,
      cell: ({row}) => {
        return <a target="_blank" href={`/tender/${row.original.unit}/${row.original.job_number}`}>
          {row.original.name}
        </a>
      }
    },
    {
      header: "標案金額",
      accessorKey: "price",
      type: 'numericColumn',
      cell: ({row}) => {
        return <div style={{textAlign: 'right'}}>{new Intl.NumberFormat('zh-TW').format(row.original.price)}</div>;
      }

    },
    {
      header: "招標日期",
      accessorKey: "publish",
      cell: ({row}) => {
        let date = dayjs(row.original.publish).format('YYYY-MM-DD');
        return date;
      }
    },
    {
      header: "決標日期",
      accessorKey: "end_date",
      cell: ({row}) => {
        let date = dayjs(row.original.end_date).format('YYYY-MM-DD');
        return date;
      }
    },

    {
      header: "得標廠商",
      accessorKey: "award",
      filter: true,

      cell: ({row}) => {
        var merchants = row.original.award && row.original.award.merchants ;
        
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
      header: "原始公告",
      accessorKey: "filename",
      filterable: false,
      cell: ({row}) => {
        let title = '', url = '';
        let date = dayjs(row.original.publish).format('YYYYMMDD');
        title = "招標公告";
        url = `//web.pcc.gov.tw/prkms/prms-viewTenderDetailClient.do?ds=${date}&fn=${row.original.filename}.xml`
        return <a target="_blank" href={url}>
          {title}
        </a>
      }
    }
  ];
  
  return <DataTable
    data={data}
    columns={columns}
  />
}
export default function Page({data, unit, stats, lookalike_units}) {
  useEffect(() => {
    fetch('/api/pageview/unit/' + unit._id, {method: 'post'})
  })
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

  const LookalikeUnitsTable = () => <DataTable data={lookalike_units} 
    columns={[
      {
        header: "單位",
        accessorKey: "_id"
      },
      {
        header: "相關標案",
        cell: ({ row }) => {
          return <a href={"/unit/" + row.original._id}>
            查看相關標案
          </a>
        }
      },
  ]}></DataTable>
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
        <h1>{title}</h1>
        <h3>{more}</h3>
        <b>累積得標金額廠商排行</b>
        <div style={{width: "100%", height: "400px"}}>
        <Bar stats={stats} />
        </div>
        <ins className="adsbygoogle"
            style={{"display":"block", "height": "100px"}}
            data-ad-client="ca-pub-9215576480847196"
            data-ad-slot="1304930582"
            data-ad-format="auto"
            data-full-width-responsive="true"></ins>
        <h3>相關標案</h3>
        
        <TenderTable data={data} />
        
        { (() => {
          if (lookalike_units.length) {
            return <div>
              <h3>相似單位</h3>
              <LookalikeUnitsTable
              
              defaultPageSize={Math.min(30, lookalike_units.length)}
              pageSizeOptions={[100, 500]}
              className="-striped -highlight"
              />
            </div>
          }
        })() }
      </div>
    </div>
  );
}
