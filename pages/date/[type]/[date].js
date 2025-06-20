const fetch = require('node-fetch');
import React from 'react'
import { useRouter } from 'next/router'
import { getApiUrl } from '../../../utils/api';
import {DatePicker} from "@nextui-org/react";
import {parseDate, today, getLocalTimeZone, CalendarDate} from "@internationalized/date";
import dayjs from 'dayjs'
import Head from 'next/head';
import { DataTable } from '../../../components/DataTable';

const getDates = async () => {
    const now = new Date()
    const year = now.getFullYear();
    const data = await fetch(getApiUrl(`/dates`)) // Or simply /dates if API supports
    const dates = await data.json();
    return dates.map((row) => {
        var day = dayjs(row.date)
        return day.format('YYYY-MM-DD') // Keep as string for easier checking
    })
}

const getTender = async (type, date) => {
    const tenders = await fetch(getApiUrl(`/date/${type}/${date}`))
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
   const availableDates = await getDates(); // Fetch all available dates
   
   if (date === "0") {
       // If "0" is passed, default to the latest available date or today if no dates available
       if (availableDates.length > 0) {
           // Sort dates descending to get the latest
           availableDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
           date = availableDates[0];
       } else {
           date = today(getLocalTimeZone()).toString();
       }
   }
   
   const tenders = await getTender(type, date)
   return {
      props: {date, type, tenders, availableDates} // Pass availableDates to the page
   };
};
 

export default function Page({date, type, tenders, availableDates}) {
  const router = useRouter()
  
  function handleDateChange(newDate) { // newDate is a CalendarDate object
      router.push(`/date/${type}/${newDate.toString()}`)
  }

  const isDateUnavailable = (calendarDate) => {
    // calendarDate is a CalendarDate object from @internationalized/date
    // We need to convert it to 'YYYY-MM-DD' string to check against availableDates
    const dateString = calendarDate.toString();
    return !availableDates.includes(dateString);
  };

  const title = `${date} ${type == 'tender' ? '招標' : '決標'}標案檢索 - 開放政府標案`;
  const desc = `${date} ${type == 'tender' ? '招標' : '決標'}標案檢索，共有 ${tenders.length} 筆標案，累積金額為 ${new Intl.NumberFormat('zh-TW').format(tenders.reduce((sum, t) => sum + (t.price || 0), 0))} 元。`;
  return (
    <div className="min-w-6xl max-w-screen-lg px-4 mx-auto">
      <div className="container starter-template ">
          <Head>
            <title>{title}</title>
            <meta name="description"
            content={desc}/>
            <meta property="og:description"
            content={desc}/>

          </Head>
          <h1>{date} {type == 'tender'? '招標': '決標'}標案檢索</h1>
          <div className="form-group">
              <div className="col-md-8">
                  <div className="form-group row">
                      
                    <div className="col-md-4">
                        <DatePicker 
                          label="標案日期選擇" 
                          value={parseDate(date)}
                          onChange={handleDateChange}
                          className="max-w-xs"
                          isDateUnavailable={isDateUnavailable}
                        />
                      </div>
                  </div>
              </div>
          </div>
          <TenderTable tenders={tenders} />
      </div>
  </div>
  )
}
