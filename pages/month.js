const fetch = require('node-fetch');
import React from 'react'


export default class extends React.Component {
   static async getInitialProps({ req }) {
      const res = await fetch('http://pcc.mlwmlw.org/api/month');
      let json = await res.json()
      json = json.sort(function(b, a) {
          if (a.year != b.year) {
              if (+a.year < +b.year) return -1;
              if (+a.year > +b.year) return 1;
              return 0;
          }
          if (+a.month < +b.month) return -1;
          if (+a.month > +b.month) return 1;
          return 0;
      });
      return { month: json }
   }
 
   render() {
     return (
        <div className="starter-template">
        <h1>歷月標案</h1>
          <ul>
          {this.props.month.map(m => <li key={m.name}><a href={"/dates/" + m.year + "/" + m.month }>檢視 {m.name} 標案 </a></li> )}
          </ul>
       </div>
     )
   }
 }
