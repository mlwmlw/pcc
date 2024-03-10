const fetch = require('node-fetch');
import React from 'react'
import { useRouter } from 'next/router'
import {Select, SelectItem} from "@nextui-org/react";
import dayjs from 'dayjs'
import Head from 'next/head';
import { DataTable } from '../../../components/DataTable';

const getDates = async () => {
    const now = new Date()
    const year = now.getFullYear();
    const data = await fetch(`https://pcc.mlwmlw.org/api/dates?year=${year}`)
    const dates = await data.json();
    return Object.keys(dates).map((date) => {
        var day = dayjs(date)
        return {year: day.format('YYYY'), month: day.format('MM'), day: day.format('DD'), date: day.format('YYYY-MM-DD')}
    })
}
const getTender = async (type, date) => {
    const tenders = await fetch(`https://pcc.mlwmlw.org/api/date/${type}/${date}`)
    return await tenders.json();
}
function TenderTable({tenders}) {
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
        header: "預算/決標金額",
        accessorKey: "price",
        align: 'right',
        cell: ( { row } ) => {
          return <div style={{textAlign: 'right'}}>{new Intl.NumberFormat('zh-TW').format(row.original.price)}</div>;
        }
      },
      {
        header: "發布日期",
        accessorKey: "publish",
        cell: ( { row } ) => {
          let date = dayjs(row.original.publish).format('YYYY-MM-DD');
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
          
          if(row.original.award && row.original.award.url) {
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
    
    return <DataTable columns={columns} data={tenders} />
}
export const getServerSideProps = async (context) => {
   let { date, type } = context.query;
   const dates = await getDates()
   date = date != "0" ? date : dates[0].date
   const tenders = await getTender(type, date)
   return {
      props: {date, type, dates, tenders}
   };
};
 

export default function Page({date, type, dates, tenders}) {
  const router = useRouter()
  function handleSelectChange(event) {
      router.push(`/date/${type}/${event.target.value}`)
  }
  return (
    <div className="min-w-6xl max-w-screen-lg px-4 mx-auto">
      <div className="container starter-template ">
          <Head>
          <title>{router.query.date} 招標標案檢索 - 開放政府標案</title>
          
          </Head>
          <h1>{date} {type == 'tender'? '招標': '決標'}標案檢索</h1>
          <div className="form-group">
              <div className="col-md-8">
                  <div className="form-group row">
                      
                    <div className="col-md-4">
                        <Select 
                          size="sm"
                          labelPlacement='outside-left'
                          label="標案日期選擇" 
                          selectedKeys={[date]}

                          className="max-w-xs" 
                          onChange={handleSelectChange}
                        >
                          {dates.map((d) => (
                            <SelectItem key={d.date} value={d.date}>
                              {d.date}
                            </SelectItem>
                          ))}
                        </Select>
                      </div>
                  </div>
              </div>
          </div>
          <TenderTable tenders={tenders} />
      </div>
  </div>
  )
}
