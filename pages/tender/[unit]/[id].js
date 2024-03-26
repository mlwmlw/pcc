const fetch = require('node-fetch');
import React from 'react'
import dayjs from 'dayjs'
import Head from 'next/head';
import {Link,Button, Chip} from "@nextui-org/react";
import Error from 'next/error'

const getTender = async (unit, id) => {
      var unit = encodeURIComponent(unit);
      const data = await fetch(`https://pcc.mlwmlw.org/api/tender/${id}/${unit}`);
      const tenders = await data.json();
      
      var award = []
      var merchants = []
      tenders.map(function(tender) {
         if(tender.award && tender.award.merchants && tender.award.merchants.length) {
            award = tender.award.merchants;
         }
         if(tender.award && tender.award.candidates) {
            merchants = tender.award.candidates;
         }
         
         return tender;
      });
			
      return {tenders: tenders, award: award, merchants: merchants};
};
export const getServerSideProps = async (context) => {
   const { unit, id } = context.query;
   const props = await getTender(unit, id)
   return {
      props: {unit, ...props}
   };
};
export default function Page({tenders, award, merchants, unit}) {   
   if (tenders.length == 0) {
      return <Error statusCode={404}  />
   }
   let desc = "招標單位：" + unit + "，招標金額：" + new Intl.NumberFormat('zh-TW').format(tenders[0].price) + "，招標日期：" + dayjs(tenders[0].publish).format('YYYY-MM-DD') + "，標案案號：" + tenders[0].id + "，分類：" + tenders[0].category;
   let title = tenders[0].name + ' - 開放政府標案';

   return (
      <div className="min-w-6xl max-w-screen-lg px-4 mx-auto">
         <Head>
            <title>{title}</title>
            <meta name="description"
            content={desc}/>
            <meta property="og:description"
            content={desc}/>
         </Head>
         <div className="container starter-template">
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div class="mt-10 p-6 bg-white border border-gray-200 rounded-lg shadow ">
                  <a href="#">
                     <h5 class="mb-2 text-2xl font-bold tracking-tight text-gray-900">標案歷史</h5>
                  </a>
                  {tenders.map(t => 
                        <div className="row">
                        <div className="col-xs-12">
                           <h2>{t.name}</h2>
                           <dl className="dl-horizontal">
                              <dt className="font-semibold">標案名稱</dt>
                              <dd>{t.name}</dd>
                              <dt className="font-semibold">招標金額</dt>
                              <dd>{new Intl.NumberFormat('zh-TW').format(t.price)}</dd>
                              <dt className="font-semibold">招標日期</dt>
                              <dd>{dayjs(t.publish).format('YYYY-MM-DD')}</dd>
                              <dt className="font-semibold">決標日期</dt>
                              <dd>{dayjs(t.end_date).format('YYYY-MM-DD')}</dd>
                              <dt className="font-semibold">標案案號</dt>
                              <dd>{t.id}</dd>
                              <dt className="font-semibold">分類</dt>
                              <dd>{t.category}</dd>
                              <dt className="font-semibold">形式</dt>
                              <dd>{t.type}</dd>
                              <dt className="font-semibold">結果</dt>
                              <dd>
                                 {t.award && t.award.merchants && t.award.merchants.length == 0 &&
                                     <Chip color="danger">無法決標</Chip>
                                 }
                                 {t.award && t.award.merchants && t.award.merchants.length > 0 &&
                                    <Chip color="success">決標</Chip>
                                 }
                              </dd>
                           </dl>
                           
                           <p className="lead" style={{textAlign:"right"}}>
                              <Button showAnchorIcon as={Link} color="primary" href={t.url || ("//web.pcc.gov.tw/prkms/prms-viewTenderDetailClient.do?ds=" + dayjs(t.publish).format('YYYY-MM-DD')+ "&fn=" + t.filename + ".xml")}>
                                 招標公告
                              </Button>
                              {t.award && t.award.url && 
                                 <Button showAnchorIcon as={Link} className="ml-4" color="success" href={t.award.url}>
                                 決標公告
                                 </Button>
                              }
                              
                           </p>
                           <hr className="my-4" />
                        </div>
                     </div>   
                     )}
               </div>
               <div>
                  <div class="mt-10 p-6 bg-white border border-gray-200 rounded-lg shadow ">
                     <a href="#">
                        <h5 class="mb-2 text-2xl font-bold tracking-tight text-gray-900">機關資訊</h5>
                     </a>
                     <div className="panel-body"><a href={"/unit/" + unit} target="_blank">{unit}</a></div>
                  </div>
                  <div class="mt-10 p-6 bg-white border border-gray-200 rounded-lg shadow ">
                     <a href="#">
                        <h5 class="mb-2 text-2xl font-bold tracking-tight text-gray-900">得標廠商</h5>
                     </a>
                     <div className="panel-body">
                        {award.map(m => 
                        <div className="row col-xs-12">
                           <a href={"/merchants/" + m.name}>
                              {m.name}
                           </a>
                           <ul className="dl-horizontal">
                              <li><strong>機關代號：</strong>{m._id}</li>
                              <li><strong>地址：</strong>{m.address}</li>
                              <li><strong>電話：</strong>{m.phone}</li>
                              <li><strong>字號：</strong>{m.registration}</li>
                              <li></li>
                           </ul>
                        </div>
                        )}
                     </div>
                  </div>
                  <div class="mt-10 p-6 bg-white border border-gray-200 rounded-lg shadow ">
                     <a href="#">
                        <h5 class="mb-2 text-2xl font-bold tracking-tight text-gray-900">投標廠商</h5>
                     </a>
                     <div className="panel-body">
                        {(merchants || []).map(m => 
                        <div className="row col-xs-12">
                           <a href={"/merchants/" + m.name}>
                              {m.org} - {m.name}
                           </a>
                        </div>
                        )}
                     </div>
                  </div>
                  <div class="mt-10 p-6 bg-white border border-gray-200 rounded-lg shadow ">
                     <a href="#">
                        <h5 class="mb-2 text-2xl font-bold tracking-tight text-gray-900">相關關鍵字</h5>
                     </a>
                     <div className="panel-body">
                        {(tenders[0].tags || []).map((word , i) => 
                           <span><a href={"/search/" + word}>{word}</a>{tenders[0].tags.length == i + 1 ? '': '、'}</span>
                        )}
                     </div>
                  </div>
               </div>
             
            </div>
         </div>
      </div>
   )
}
