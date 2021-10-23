const fetch = require("node-fetch");
import React from "react";
import ReactTable from "react-table";
import "react-table/react-table.css";
import ReactPaginate from 'react-paginate';
import Router from 'next/router'
import _ from 'lodash'
import Head from 'next/head';
export default class extends React.Component {
   constructor(props) {
      super(props);

   }
  static async getInitialProps({ req, query }) {

    let keyword = query.keyword;
		let options = {};
		if(req.headers['user-agent']) {
			options = {
				headers: {
					'user-agent': req.headers['user-agent'],
					'X-Forwarded-For': req.connection.remoteAddress
				}
			};
		} else {
			console.log('no user-agent');
			return {tenders: [], keyword: null}
		}
    const result = await fetch("http://pcc.mlwmlw.org/api/keyword/" + encodeURIComponent(keyword), options);
    let tenders = await result.json();
    return { tenders, keyword };
  }
  
  render() {
    let currentYear = new Date().getFullYear();
    let {keyword, tenders} = this.props;
    return (
      <div className="starter-template">
       <Head>
        <title>{currentYear}年{keyword}標案查詢 - 開放政府標案</title>
        
        <meta property="og:description"
        content="開放標案廠商列表" />
        </Head>
        <h1>搜尋 {keyword} 標案列表</h1>
        { tenders.length == 0 ? <h3>找不到結果</h3>: null}
        <ReactTable
          data={tenders}
          columns={[
            {
              Header: "機關",
              accessor: "unit",
              Cell: ({ row }) =>
            <a target="_blank" href={`/unit/${row._original.unit_id}`}>{row.unit}</a>
            },
            {
              Header: "標案名稱",
              accessor: "name",
              Cell: ({ row }) =>
                <a target="_blank" href={`/tender/${row.unit}/${row._original.job_number}`}>
                  {row.name}
                </a>
            },
            {
              Header: "招標日期",
              accessor: "publish",
            },
            {
              Header: "得標公司",
              accessor: "merchants",
							filterMethod: (filter, row) => {
								return row[filter.id].filter((val) => {
									return val.indexOf(filter.value)  !== -1
								}).length
							},
              Cell: ({ row }) =>
                { if (row.merchants.length == 0) {
                  return null;
                } else {
                  return <ul style={{
                      "list-style": "circle", 
                      "paddingLeft": "20px"
                  }}>
                    {row.merchants.map(function(m) {
                      return <li key={m}>
                        <a target="_blank" href={`/merchants/${m}`}>{m}</a>
                        </li>
                    })}
                  </ul>
                }}
						}
          ]}
          onFilteredChange={(filtered, column) => {
            
          }}
          layout="horizontal"
          defaultPageSize={Math.min(200, tenders.length)}
          showPagination={true}
          showPaginationTop={false}
          showPaginationBottom={true}
					filterable={true}
          pageSizeOptions={[100, 200, 500]}
          className="-striped -highlight"
        />

      </div>
    );
  }
}
