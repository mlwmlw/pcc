const fetch = require("node-fetch");
import React from "react";
import ReactTable from "react-table";
import "react-table/react-table.css";
import ReactPaginate from 'react-paginate';
import Router from 'next/router'
import dayjs from 'dayjs'
import C3Chart from 'react-c3js';
import Head from 'next/head';
import 'c3/c3.css';
Number.prototype.format = function(n, x, s, c) {
  var re = '\\d(?=(\\d{' + (x || 3) + '})+' + (n > 0 ? '\\D' : '$') + ')',
      num = this.toFixed(Math.max(0, ~~n));

  return (c ? num.replace('.', c) : num).replace(new RegExp(re, 'g'), '$&' + (s || ','));
};

export default class extends React.Component {
   constructor(props) {
      super(props);      
      this.state = {year: null}
   }
  static async getInitialProps({ req, query, params }) {
    const unit_res = await fetch("http://pcc.mlwmlw.org/api/unit_info/" + encodeURIComponent(query.parent));
    const unit = await unit_res.json()
    const res = await fetch("http://pcc.mlwmlw.org/api/units/" + encodeURIComponent(query.parent));
    const units = await res.json()

    units.sort(function(a, b) {
      return b.childs - a.childs;
    })
    return { units, unit };
  }
 
  render() {
    let { units, unit }= this.props;
    let title = unit.name + '機關檢索'
    let desc = unit.name + " 相關機關列表";
    
    let more = [];
    
    return (
      <div className="starter-template">
        <Head>
        <title>{title} - 開放政府標案</title>
        <meta property="og:description"
        content={desc}/>
        </Head>
        <h1>{title}</h1>
        <h3><a href={"/unit/" + unit.name} target="_blank">{unit.name} 標案查詢</a></h3>
        <ReactTable
          data={units}
          columns={[
            {
              Header: "代號",
              accessor: "_id"
            
            },
            {
              Header: "機關",
              accessor: "name"
            },
            {
              Header: "子機關數",
              accessor: 'childs',
              Cell: ({ row }) => {                
               return row.childs ? <a target="_blank" href={"/units/" + row._id}>
                 {row.childs}
               </a>: '無'
             }
            },
            {
              Header: "標案數",
              accessor: 'tenders'
            },
            {
              Header: "檢索標案",
              accessor: 'tenders',
              Cell: ({ row }) => {                
                return row.tenders ? <a  target="_blank" href={"/unit/" + encodeURIComponent(row.name)}>
                  查詢{row.name}標案
                </a>: ''
              }
            }
          ]}
         
          defaultPageSize={100}
          pageSizeOptions={[100, 500]}
          className="-striped -highlight"
        />
        
        
      </div>
    );
  }
}
