const fetch = require("node-fetch");
import React from "react";
import ReactTable from "react-table";
import "react-table/react-table.css";
import ReactPaginate from 'react-paginate';
import Router from 'next/router'
import _ from 'lodash'
export default class extends React.Component {
   constructor(props) {
      super(props);

      this.state = {pages: 0};
      this.debounce = _.debounce(this.fetchData.bind(this), 3000);
   }
  static async getInitialProps({ req, query, params }) {
    const res = await fetch("http://pcc.mlwmlw.org/api/merchants/");
    let count = await res.json();
    console.log(params);
    
    
    return { page: page - 1, pages:  Math.ceil(parseFloat(count/100)), merchants: merchants };
  }
 
  
  render() {
    let data = this.props.merchants 
    if(this.state && this.state.merchants) 
      data = this.state.merchants;
    return (
      <div className="starter-template">
        <h1>廠商列表</h1>
        <ReactTable
          data={data}
          columns={[
            {
              Header: "廠商",
              accessor: "name"
            },
            {
              Header: "單位",
              accessor: "org"
            },
            {
              Header: "電話",
              accessor: "phone"
            },
            {
              Header: "公司所在地",
              accessor: "address"
            },
            {
              Header: "標案檢索",
              accessor: "_id",
              filterable: false,
              Cell: ({ row }) =>
                <a target="_blank" href={`/merchants/${row._id}`}>
                  前往
                </a>
            }
          ]}
          manual
          
          //defaultFilterMethod={(filter, row) =>
           // ("" + row[filter.id]).indexOf(filter.value) >= 0}
          onFilteredChange={(filtered, column) => {
            
            //this.setState({filtered}, () => this.debounce(this.state))
              //this.fetchDate(this .state)
            //)
          }}
          onFetchData={(state, instance) => {
            if(this.props.page == state.page)
               return;
            this.setState({ loading: true });
            this.fetchData(state)
          }}
          onPageChange={(pageIndex) => {
            Router.push('/merchants?page=' + (pageIndex + 1))
            this.setState({page: pageIndex})
          }}
          filtered={this.state.filtered}
          page={this.state.page || this.props.page}
          pages={this.state.pages || this.props.pages}
          defaultPageSize={100}
          showPagination={true}
          showPaginationTop={false}
          showPaginationBottom={true}
          pageSizeOptions={[100]}
          className="-striped -highlight"
        />
        
        
      </div>
    );
  }
}
