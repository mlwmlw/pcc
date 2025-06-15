const fetch = require('node-fetch');
import React from 'react'
import { getApiUrl } from '../utils/api';

const getMonth = async () => {
  const data = await fetch(getApiUrl('/month'))
  const month = await data.json();
  return month.filter(m => m.year > 1970).sort(function(b, a) {
    if (a.year != b.year) {
        if (+a.year < +b.year) return -1;
        if (+a.year > +b.year) return 1;
        return 0;
    }
    if (+a.month < +b.month) return -1;
    if (+a.month > +b.month) return 1;
    return 0;
  })
};
export const getServerSideProps = async (context) => {
  const month = await getMonth()
  return {
    props: {month}
  };
};



export default function Month({month}) {
  return <div className="min-w-6xl max-w-screen-lg px-4 mx-auto">
  <div className="container starter-template">
  <h1>歷月標案</h1>
    <ul>
    {month.map(m => <li key={m.name}><a target="_blank" href={"/dates/" + m.year + "/" + m.month }>檢視 {m.name} 標案 </a></li> )}
    </ul>
  </div>
  </div>
}
