import fetch from 'node-fetch'
import React from "react";
import { getApiUrl } from '../utils/api';

import { useEffect, useState } from 'react'
import Router from 'next/router'
import _ from 'lodash'
import Head from 'next/head';
import { DataTable } from "../components/DataTable";



const getMerchants = async (page) => {
  const res = await fetch(getApiUrl('/merchants?count=1'));
  let count = await res.json();
  page = page ? +page: 1;
  
  const mres = await fetch(getApiUrl(`/merchants?page=${page}`));
  let merchants = await mres.json();

  return { page: page, pages:  Math.ceil(parseFloat(count/100)), merchants: merchants };
};
export const getServerSideProps = async (context) => {
  const { page } = context.query;
  const props = await getMerchants(page)
  return {
    props: props
  };
};

function MerchantsTable({data, pages, page, setPage}) {
  const columns = [
    {
      header: "廠商",
      accessorKey: "name"
    },
    {
      header: "單位",
      accessorKey: "org"
    },
    {
      header: "電話",
      accessorKey: "phone"
    },
    {
      header: "公司所在地",
      accessorKey: "address"
    },
    {
      header: "標案檢索",
      accessorKey: "_id",
      filterable: false,
      cell: ( row ) => {
        return <a target="_blank" href={`/merchants/${row.getValue()}`}>
          前往
        </a>
      }
    }
  ]
  
  return <DataTable columns={columns} data={data} page={page} pages={pages} setPage={setPage} />

}
export default function Page({merchants, pages, page}) {
  
  const [merchantsStatus, setMerchants] = useState([]);
  const [pageStatus, setPageStatus] = useState(null);
  async function setPage(page) {
    Router.push('/merchants?page=' + (page))
    const {merchants} = await getMerchants(page);
    setMerchants(merchants)
    setPageStatus(page)
  }
  
  let data = merchantsStatus.length > 0 ? merchantsStatus: merchants;
  page = pageStatus || page
  return (
    <div className="min-w-6xl max-w-screen-lg px-4 mx-auto">

    <div className="container starter-template">
      <Head>
      <title>廠商列表 - 開放政府標案</title>
      <meta name="description" content="開放標案廠商列表 - 查詢全台政府標案得標廠商資訊" />
      <meta property="og:title" content="廠商列表 - 開放政府標案" />
      <meta property="og:description" content="開放標案廠商列表 - 查詢全台政府標案得標廠商資訊" />
      <meta property="og:image" content="/api/og-image/top-merchants" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:type" content="website" />
      <meta property="og:url" content="https://pcc.mlwmlw.org/merchants" />
      </Head>
      <h1>廠商列表</h1>
      
      <MerchantsTable data={data} pages={pages} page={page} setPage={setPage} />
    </div>
    </div>
  );
}
