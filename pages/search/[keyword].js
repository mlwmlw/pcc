import fetch from "node-fetch";
import React,{ useState, useEffect } from "react";
import { DataTable } from "../../components/DataTable";
import _ from 'lodash'
import Head from 'next/head';
import { getApiUrl } from "../../utils/api";

export const getServerSideProps = async (context) => {
  const { keyword } = context.query;
  const props = await getTenders(keyword)
  return {
    props: props
  };
};
const getTenders = async (keyword) => {
  const result = await fetch(getApiUrl(`/keyword/` + encodeURIComponent(keyword)));
  let tenders = await result.json();
  return { tenders, keyword };
}
export default function Page({tenders, keyword}) {
  let currentYear = new Date().getFullYear();
  
  const columns = [
    {
      header: "機關",
      accessorKey: "unit",
      cell: ({ row }) =>
        <a target="_blank" href={`/unit/${row.original.unit_id}`}>{row.original.unit}</a>
    },
    {
      header: "標案名稱",
      accessorKey: "name",
      cell: ({ row }) =>
        <a target="_blank" href={`/tender/${row.original.unit}/${row.original.job_number}`}>
          {row.original.name}
        </a>
    },
    {
      header: "招標日期",
      accessorKey: "publish",
    },
    {
      header: "得標公司",
      accessorKey: "merchants",
      filterMethod: (filter, row) => {
        return row[filter.id].filter((val) => {
          return val.indexOf(filter.value)  !== -1
        }).length
      },
      cell: ({ row }) =>
        { if (row.original.merchants.length == 0) {
          return null;
        } else {
          return <ul style={{
              "listStyle": "circle", 
              "paddingLeft": "20px"
          }}>
            {row.original.merchants.map(function(m) {
              return <li key={m}>
                <a target="_blank" href={`/merchants/${m}`}>{m}</a>
                </li>
            })}
          </ul>
        }}
    }
  ]
  const title = `${currentYear}年${keyword}標案搜尋結果  - 開放政府標案`;
  return <div className="min-w-6xl max-w-screen-lg px-4 mx-auto">
    <Head>
      <title>{title}</title>
      <meta property="og:description"
      content="搜尋結果" />
      
    </Head>
    <ins className="adsbygoogle"
        style={{"display":"block", "height": "20px"}}
      data-ad-client="ca-pub-9215576480847196"
      data-ad-slot="1304930582"
      data-ad-format="auto"
      data-full-width-responsive="true">
    </ins>
    <h1 className="text-xl">搜尋<b>{keyword}</b>標案結果</h1>
    { tenders.length == 0 ? <h3 className="text-lg">找不到結果，請使用其他關鍵字搜尋</h3>: <DataTable columns={columns} data={tenders} />}
    
    <ins className="adsbygoogle"
          style={{"display":"block", "height": "50px"}}
        data-ad-client="ca-pub-9215576480847196"
        data-ad-slot="1304930582"
        data-ad-format="auto"
        data-full-width-responsive="true">
    </ins>
  </div>
  
}
