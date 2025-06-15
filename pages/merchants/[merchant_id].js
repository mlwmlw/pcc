import fetch from 'node-fetch'
import React, { useState } from 'react';
import { DataTable } from "../../components/DataTable";
import { getApiUrl } from "../../utils/api";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import dayjs from 'dayjs'
import Head from 'next/head';
import { useEffect } from 'react';

const dark24 = [
  '#1F77B4', '#FF7F0E', '#2CA02C', '#D62728', '#9467BD', '#8C564B', 
  '#E377C2', '#7F7F7F', '#BCBD22', '#17BECF', '#AEC7E8', '#FFBB78', 
  '#98DF8A', '#FF9896', '#C5B0D5', '#C49C94', '#F7B6D2', '#C7C7C7', 
  '#DBDB8D', '#9EDAE5', '#393B79', '#637939', '#8C6D31', '#843C39'
];

function MerchantLineChart({data}) {
  return (
    <ResponsiveContainer>
      <LineChart
        data={data[0].data || []}
        margin={{ top: 10, right: 30, bottom: 5, left: 25 }}
      >
        <CartesianGrid strokeDasharray="2 4" stroke="#f0f0f0" strokeOpacity={0.8} vertical={false} />
        <XAxis 
          dataKey="x"
          angle={-45}
          height={45}
          dy={0}
          tick={{fontSize: 12}}
          interval={0}
          textAnchor="end"
        />
        <YAxis
          tickFormatter={(value) => 
            value >= 1000000000 
              ? `${(value/1000000000).toFixed(1)}B`
              : value >= 1000000 
                ? `${(value/1000000).toFixed(0)}M`
                : `${(value/1000).toFixed(0)}k`
          }
          tickSize={3}
          dx={-2}
          width={25}
          tickMargin={2}
          orientation="left"
          axisLine={false}
          tick={{ fontSize: 11, fill: '#666' }}
        />
        <Tooltip
          formatter={(value) => [`$${Number(value).toLocaleString()}`, '得標金額']}
        />
        <Legend />
        <Line
          dataKey="y"
          name="得標金額"
          stroke={dark24[0]}
          dot={true}
          strokeWidth={2}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
const getMerchant = async (merchant_id) => {
  merchant_id = encodeURIComponent(merchant_id);
  const merchant_res = await fetch(getApiUrl(`/merchant/${merchant_id}`));
  const merchant = await merchant_res.json()
  const lookalike = await fetch(getApiUrl(`/lookalike/${merchant_id}`));
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
function MerchantPieChart({stats, setSelectedParent, parentUnits}) {
  return (
    <ResponsiveContainer>
      <PieChart margin={{ top: 10, right: 120, bottom: 10, left: 10 }}>
          <Pie
            data={stats}
            cx="50%"
            cy="50%"
            innerRadius="42%"
            outerRadius="75%"
            dataKey="value"
            nameKey="id"
            paddingAngle={2}
            onClick={(entry) => {
              if (entry.id !== '其他' && parentUnits.includes(entry.id)) {
                setSelectedParent(entry.id);
              }
            }}
            style={{ cursor: 'pointer' }}
          label={({ value, id, percent }) => 
            `${id} (${value >= 1000000000 
              ? `${(value/1000000000).toFixed(0)}B`
              : value >= 1000000 
                ? `${(value/1000000).toFixed(0)}M`
                : `${(value/1000).toFixed(0)}k`
            }, ${(percent * 100).toFixed(1)}%)`
          }
          labelLine={{
            strokeWidth: 0.8,
            stroke: '#666',
            strokeDasharray: "3 3"
          }}
        >
          {stats.map((entry, index) => (
            <Cell 
              key={`cell-${index}`}
              fill={dark24[index % dark24.length]}
              stroke="#fff"
              strokeWidth={0.5}
            />
          ))}
        </Pie>
        <Tooltip 
          formatter={(value) => [`$${Number(value).toLocaleString()}`, '得標金額']}
        />
        <Legend 
          layout="vertical"
          align="right"
          verticalAlign="middle"
          wrapperStyle={{
            paddingLeft: "8px",
            fontSize: "12px",
            lineHeight: "1.4",
            cursor: "pointer"
          }}
          onClick={(entry) => {
            if (entry.value !== '其他' && parentUnits.includes(entry.value)) {
              setSelectedParent(entry.value);
            }
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
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
  const [selectedParent, setSelectedParent] = useState('全部');
  
  useEffect(() => {
    fetch(getApiUrl(`/pageview/merchant/${merchant_id}`), {method: 'post'})
  })

  let currentYear = new Date().getFullYear(); 

  // 取得所有母機關
  const parentUnits = ['全部'].concat([...new Set(
    merchant.tenders
      .filter(t => t.parent_unit && t.parent_unit.name)
      .map(t => t.parent_unit.name)
  )].sort());

  var desc = '近期得標案件：';
  var title = currentYear + '年 ' + merchant.name + '得標案件';
  
  for (var i in merchant.tenders) {
    if(i < 5)
      desc += dayjs(merchant.tenders[i].publish).format('YYYY-MM-DD') + " " + merchant.tenders[i].name + "、";
  }
  let stats = merchant.tenders.reduce(function(total, row) {
    let unit;
    if (row.parent_unit && row.parent_unit.name) {
      unit = row.parent_unit.name.replace(/\s/g, '');
    } else if (row.unit) {
      unit = row.unit.replace(/\s/g, '');
    } else {
      return total;
    }
    if (!total[unit]) {
      total[unit] = 0;
    }
    if (row.award && row.award.merchants) {
      row.award.merchants.forEach((tender) => {
        if (merchant._id == tender._id && +tender.amount > 0) {
          total[unit] += +tender.amount;
        }
      });
    }
    return total;
  }, {});
  // 先轉換成陣列並排序
  stats = Object.keys(stats).map((key) => ({
    id: key,
    label: key,
    value: stats[key]
  })).sort((a, b) => b.value - a.value);

  // 只取前15個，剩下的加總到"其他"
  if (stats.length > 15) {
    const topStats = stats.slice(0, 15);
    const otherValue = stats.slice(15).reduce((sum, item) => sum + item.value, 0);
    
    if (otherValue > 0) {
      topStats.push({
        id: '其他',
        label: '其他',
        value: otherValue
      });
    }
    
    stats = topStats;
  }

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
      <meta name="description" content={desc}/>
      <meta property="og:title" content={title + ' - 開放政府標案'}/>
      <meta property="og:description" content={desc}/>
      <meta property="og:image" content={`/api/og-image/merchant?id=${merchant._id || merchant_id}`}/>
      <meta property="og:image:width" content="1200"/>
      <meta property="og:image:height" content="630"/>
      <meta property="og:type" content="website"/>
      <meta property="og:url" content={`https://pcc.mlwmlw.org/merchants/${merchant._id || merchant_id}`}/>
      </Head>
      <div className="container starter-template">
        
        <h1>{currentYear}年{merchant.name}得標案件</h1>
        <span>公司統一編號：{merchant._id}</span><br />
        {(() => {
          if (directors.length) {
            return <>
              <span>董監事：</span><br />
              <ul>
                {directors.map((row, i) => {
                  return <li key={i}>{row.title}：{row.name}</li>
                })}
              </ul>
            </>
          }
        })()}
        <a href={"https://company.g0v.ronny.tw/index/search?q=" + merchant._id} target="_blank">查看公司資料</a>
        <div style={{width: "100%", height: line[0].data.length > 1 ? "250px": 0}}>
          <MerchantLineChart data={line} />
        </div>
        <ins className="adsbygoogle"
          style={{"display":"block", "height": "100px", "width": "100%"}}
          data-ad-client="ca-pub-9215576480847196"
          data-ad-slot="1304930582"
          data-ad-format="auto"
          data-full-width-responsive="true"></ins>
        <div style={{width: "100%", height: stats.length > 1 ? "400px": 0}}>
        <MerchantPieChart stats={stats} setSelectedParent={setSelectedParent} parentUnits={parentUnits} />
        </div>
        
        <h3>相關得標案件</h3>
        <div className="mb-4 flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
            篩選發標單位：
          </label>
          <select
            value={selectedParent}
            onChange={(e) => setSelectedParent(e.target.value)}
            className="mt-1 block w-64 p-2 border border-gray-300 rounded-md shadow-sm"
          >
            {parentUnits.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </div>
        <TenderTable
          merchant={{
            ...merchant,
            tenders: merchant.tenders.filter(tender => 
              selectedParent === '全部' || 
              (tender.parent_unit && tender.parent_unit.name === selectedParent)
            )
          }}
        />
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
