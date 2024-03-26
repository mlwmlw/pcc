import fetch from 'node-fetch'
import React from "react";
import dynamic from 'next/dynamic';
import { DataTable } from "../../components/DataTable";

import dayjs from 'dayjs'
import Head from 'next/head';
function LineChart({data}) {
  const ResponsiveLine = dynamic(() => {
    return import('@nivo/line').then((mod) => mod.ResponsiveLine)
  }, { ssr: false })
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
      useMesh={true}
      
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
const getMerchant = async (merchant_id) => {
  merchant_id = encodeURIComponent(merchant_id);
  const merchant_res = await fetch("https://pcc.mlwmlw.org/api/merchant/" + merchant_id);
  const merchant = await merchant_res.json()
  const lookalike = await fetch("https://pcc.mlwmlw.org/api/lookalike/" + merchant_id);
  const merchants = await lookalike.json()

  const years = ['全部'].concat(merchant.tenders.map(function(row) {
      var d = new Date(row.publish);
      return d.getFullYear()
  }).filter(function onlyUnique(value, index, self) {
      return self.indexOf(value) === index;
  }).sort().reverse());
  return { merchant, years, merchant_id, merchants, directors: merchant.directors || [] };
};
export const getServerSideProps = async (context) => {
  const { merchant_id } = context.query;
  const props = await getMerchant(merchant_id)

  if( props.merchant._id && props.merchant._id != merchant_id) {
    return {
      redirect: {
        destination: `/merchants/${props.merchant._id}`,
        permanent: true,
      }
    };
  }
    
  return {
    props: props
  };
};
function PieChart({stats}) {
  const ResponsivePie = dynamic(() => {
    return import('@nivo/pie').then((mod) => mod.ResponsivePie)
  }, { ssr: false })
  return <ResponsivePie data={stats}
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
  colors={{scheme: "paired"}}
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
}
function TenderTable({merchant}) {
  const columns = [
    {
      header: "單位",
      accessorKey: "unit",
      
      cell: ( { row } ) => {
        return <a href={"/unit/" + row.original.unit}>
          {row.original.unit}
        </a>
      }
    },
    {
      header: "標案名稱",
      accessorKey: "name",
      
      cell: ( { row } ) => {
        return <a target="_blank" href={`/tender/${row.original.unit}/${row.original.job_number}`}>
          {row.original.name}
        </a>
      }
    },
    {
      header: "類型",
      accessorKey: "type",
      cell: ( { row } ) => {
        return row.original.type ? row.original.type.replace(/\(.+\)公告/, ''): null
      }
    },
    {
      header: "標案金額",
      accessorKey: "price",
      align: 'right',
      cell: ( { row } ) => {
        return <div style={{textAlign: 'right'}}>{new Intl.NumberFormat('zh-TW').format(row.original.price)}</div>;
      }
    },
    {
      header: "招標日期",
      accessorKey: "publish",
      cell: ( { row } ) => {
        let date = dayjs(row.original.publish).format('YYYY-MM-DD');
        return date;
      }
    },
    {
      header: "決標日期",
      accessorKey: "end_date",
      cell: ( { row } ) => {
        let date = dayjs(row.original.end_date).format('YYYY-MM-DD');
        return date;
      }
    },
    {
      header: "得標廠商",
      accessorKey: "award",
      cell: ( { row } ) => {
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
      cell: ( { row } ) => {
        let title = '', url = '';
        
        if(row.original.award.url) {
          title = "決標公告";
          url = row.original.award.url;
        }
        else {
          let date = dayjs(row.original.publish).format('YYYYMMDD');
          title = "招標公告";
          url = `//web.pcc.gov.tw/prkms/prms-viewTenderDetailClient.do?ds=${date}&fn=${row.original.filename}.xml`
        }
        
        return <a target="_blank" href={url}>
          {title}
        </a>
      }
    }
  ];
  return <DataTable columns={columns} data={merchant.tenders} />
}
export default function Page({merchant, years, merchant_id, merchants, directors}) {
  let currentYear = new Date().getFullYear(); 

  var desc = '近期得標案件：';
  var title = currentYear + '年 ' + merchant.name + '得標案件';
  
  for (var i in merchant.tenders) {
    if(i < 5)
      desc += dayjs(merchant.tenders[i].publish).format('YYYY-MM-DD') + " " + merchant.tenders[i].name + "、";
  }
  let stats = merchant.tenders.reduce(function(total, row) {
    if(!row.parent_unit || !row.parent_unit.name) {
      return total;
    }
    var unit = row.parent_unit.name.replace(/\s/g, '')
    if(!total[unit])
      total[unit] = 0;
    total[unit] += +row.price;
    return total;
  }, {});
  stats = Object.keys(stats).map((key) => {
    return {
      id: key,
      label: key,
      value: stats[key]
    }
  })

  let line_data = merchant.tenders.reduce(function(total, row) {
    
    var d = new Date(row.publish);
    if(!row.publish) {
      return total;
    } 
    if(!total[d.getFullYear()]) {
      total[d.getFullYear()] = 0;
    }
    
    row.award.merchants.forEach((tender) => {
      if (merchant._id == tender._id && +tender.amount > 0) {
        total[d.getFullYear()] += +tender.amount;
      }
    })
    //total[d.getFullYear()] += +row.price;
    return total;
  }, {});
  
  
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
    <div className="min-w-6xl max-w-screen-lg px-4 mx-auto">
      <Head>
      <title>{title} - 開放政府標案</title>
      <meta name="description"
      content={desc}/>
      <meta property="og:description"
      content={desc}/>
      </Head>
      <div className="container starter-template">
        
        <h1>{currentYear}年{merchant.name}得標案件</h1>
        <span>公司統一編號：{merchant._id}</span><br />
        {(() => {
          if (directors.length) {
            return <>
              <span>董監事：</span><br />
              <ul>
                {directors.map((row) => {
                  return <li>{row.title}：{row.name}</li>
                })}
              </ul>
            </>
          }
        })()}
        <a href={"https://company.g0v.ronny.tw/index/search?q=" + merchant._id} target="_blank">查看公司資料</a>
        <div style={{width: "100%", height: line[0].data.length > 1 ? "400px": 0}}>
          <LineChart data={line} />
        </div>
        <div style={{width: "100%", height: stats.length > 1 ? "400px": 0}}>
        <PieChart stats={stats} />
        </div>
        <ins className="adsbygoogle"
          style={{"display":"block", "height": "100px", "width": "100%"}}
          data-ad-client="ca-pub-9215576480847196"
          data-ad-slot="1304930582"
          data-ad-format="auto"
          data-full-width-responsive="true"></ins>
        <h3>相關得標案件</h3>
        <TenderTable merchant={merchant} />
        {(() => {
          if (merchants.length > 0) {
            <>
              <h3>查看更多相似廠商</h3>
              <DataTable
                data={merchants}
                columns={[
                  {
                    header: "廠商名稱",
                    accessorKey: "name"
                  },
                  {
                    header: "相關標案",
                    accessorKey: "_id",
                    cell: ({ row }) => {
                      return <a href={"/merchants/" + row._id}>
                        查看相關標案
                      </a>
                    }
                  },
                ]}
                className="-striped -highlight"
              />
            </>
          }
        })()}
        
      </div>
    </div>
  );
}
