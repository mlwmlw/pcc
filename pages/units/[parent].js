
import React from "react";
import fetch from "node-fetch";
import { DataTable } from "../../components/DataTable";

import Head from 'next/head';
Number.prototype.format = function(n, x, s, c) {
  var re = '\\d(?=(\\d{' + (x || 3) + '})+' + (n > 0 ? '\\D' : '$') + ')',
      num = this.toFixed(Math.max(0, ~~n));

  return (c ? num.replace('.', c) : num).replace(new RegExp(re, 'g'), '$&' + (s || ','));
};
function UnitTable({units}) {
  
  const columns = [
    {
      header: "代號",
      accessorKey: "_id"
    
    },
    {
      header: "機關",
      accessorKey: "name"
    },
    {
      header: "子機關數",
      accessorKey: 'childs',
      cell: ({ row }) => {                
        return row.original.childs ? <a href={"/units/" + row.original._id}>
          {row.original.childs}
        </a>: '無'
      }
    },
    {
      header: "標案數",
      accessorKey: 'tenders'
    },
    {
      header: "檢索標案",
      accessorKey: 'tenders',
      cell: ({ row }) => {                
        return <a href={"/unit/" + encodeURIComponent(row.original.name)}>
          查詢{row.original.name}標案
        </a>
      }
    }
  ];
  return <DataTable columns={columns} data={units} />
}
export const getServerSideProps = async (context) => {
  let parent = context.query.parent == "0" ? '': context.query.parent;
  let unit = {name: '所有'};
  if(parent) {
    const unit_res = await fetch("http://pcc.mlwmlw.org/api/unit_info/" + encodeURIComponent(parent));
    unit = await unit_res.json()
  }
  
  const res = await fetch("http://pcc.mlwmlw.org/api/units/" + encodeURIComponent(parent));
  const units = await res.json()

  units.sort(function(a, b) {
    return b.childs - a.childs;
  })
  
  return {
    props: { units, unit }
  };
};
export default function Page({units, unit}) {
  let title = unit.name + '機關檢索'
  let desc = unit.name + " 相關機關列表";
  var link = null;
  if(unit.name != '所有')
    link = <h3><a href={"/unit/" + unit.name} target="_blank">{unit.name} 標案查詢</a></h3>
  let more = [];
  
  return (
    <div className="min-w-6xl max-w-screen-xl px-4 mx-auto">
      <div className="container starter-template">
        <Head>
        <title>{title} - 開放政府標案</title>
        <meta name="description"
        content={desc}/>
        <meta property="og:description"
        content={desc}/>
        </Head>
        <h1>{title}</h1>
        {link}
        <UnitTable units={units} />
      </div>
    </div>
  );

}
