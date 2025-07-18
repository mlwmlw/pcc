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
  
  async function setPage(newPage) {
    Router.push('/merchants?page=' + newPage)
  }
  
  // Use props directly, no need for client-side status for merchants and page
  // as getServerSideProps will re-run on route change
  const data = merchants;
  // page prop is already the current page from getServerSideProps

  return (
    <div className="min-w-6xl max-w-screen-lg px-4 mx-auto">

    <div className="container starter-template">
      <Head>
      <title>廠商列表 - 開放政府標案</title>
      <meta name="description" content="開放標案廠商列表 - 查詢全台政府標案得標廠商資訊" />
      <meta property="og:title" content="廠商列表 - 開放政府標案" />
      <meta property="og:description" content="開放標案廠商列表 - 查詢全台政府標案得標廠商資訊" />
      </Head>
      <h1>廠商列表</h1>
      
      <MerchantsTable data={data} pages={pages} page={page} setPage={setPage} />
    </div>
    </div>
  );
}
