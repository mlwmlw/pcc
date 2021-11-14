const fetch = require('node-fetch');
import React from 'react'
import dayjs from 'dayjs'
import Head from 'next/head';
import ErrorPage from 'next/error'

export default class extends React.Component {
   static async getInitialProps({ req, query, params }) {
      var unit = encodeURIComponent(query.unit);
      const res = await fetch(`https://pcc.mlwmlw.org/api/tender/${query.id}/${unit}`);
      let tenders = await res.json();
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
			

      /*
      const fetchAward = async () => {
         return Promise.all(award.map(async a =>
            fetch('http://pcc.mlwmlw.org//api/merchants/' + encodeURIComponent(a.name))
            )
         )
      }
      var awards = await fetchAward()
      award = await Promise.all(awards.map(async r => await r.json()))
      */
      
      return {tenders: tenders, award: award, merchants: merchants, unit: query.unit};
   }
   componentDidMount() {
		 var tenders = this.props.tenders;
		 if(tenders.length == 0) {
			 return;
		 }
		 $.post('/api/pageview/tender/' + tenders[0]._id)	
	 }
   render() {

		 if(this.props.tenders.length == 0) {
			 return <ErrorPage statusCode={404} />
		 }
      const desc = "招標單位：" + this.props.unit + "，招標金額：" + new Intl.NumberFormat('zh-TW').format(this.props.tenders[0].price) + "，招標日期：" + dayjs(this.props.tenders[0].publish).format('YYYY-MM-DD') + "，標案案號：" + this.props.tenders[0].id + "，分類：" + this.props.tenders[0].category;
      return (
        <div className="container starter-template">
         <Head>
         <title>{this.props.tenders[0].name} - 開放政府標案</title>
         <meta name="description"
         content={desc}/>
         <meta property="og:description"
         content={desc}/>
         </Head>
         <div className="col-sm-8">
            <div className="panel panel-default">
               <div className="panel-heading">標案歷史</div>
               <div className="panel-body">
               {this.props.tenders.map(t => 
                  <div className="row">
                  <div className="col-xs-12">
                     <h2>{t.name}</h2>
                     <dl className="dl-horizontal">
                        <dt>標案名稱</dt>
                        <dd>{t.name}</dd>
                        <dt>招標金額</dt>
                        <dd>{new Intl.NumberFormat('zh-TW').format(t.price)}</dd>
                        <dt>招標日期</dt>
                        <dd>{dayjs(t.publish).format('YYYY-MM-DD')}</dd>
                        <dt>決標日期</dt>
                        <dd>{dayjs(t.end_date).format('YYYY-MM-DD')}</dd>
                        <dt>標案案號</dt>
                        <dd>{t.id}</dd>
                        <dt>分類</dt>
                        <dd>{t.category}</dd>
                        <dt>形式</dt>
                        <dd>{t.type}</dd>
                        <dt>結果</dt>
                        <dd>
                           {t.award && t.award.merchants.length == 0 &&
                           <span className="label label-danger" >
                              無法決標
                           </span>   
                           }
                           {t.award && t.award.merchants.length > 0 &&
                           <span className="label label-success">決標</span>
                           }
                        </dd>
                     </dl>
                     <p className="lead" style={{textAlign:"right"}}>
                        <a target="_blank" href={"//web.pcc.gov.tw/prkms/prms-viewTenderDetailClient.do?ds=" + dayjs(t.publish).format('YYYY-MM-DD')+ "&fn=" + t.filename + ".xml"}><button className="btn btn-info">招標公告</button></a> 
                        {t.award && t.award.url && 
                        <a style={{marginLeft: 5}} target="_blank" href={t.award.url}>
                           <button className={(t.award.merchants.length == 0 ? 'btn-danger ': '') + (t.award.merchants.length ? 'btn-success ': '') + ' btn'}>決標公告</button></a>
                        }
                     </p>
                     <hr />
                  </div>
               </div>   
               )}
                  
               </div>
            </div>
						<ins className="adsbygoogle"
							style={{"display":"block", "height": "150px"}}
							data-ad-client="ca-pub-9215576480847196"
							data-ad-slot="1304930582"
							data-ad-format="auto"
							data-full-width-responsive="true"></ins>
         </div>
         <div className="col-sm-4">
            <div className="panel panel-default">
               <div className="panel-heading">機關資訊</div>
               <div className="panel-body"><a href={"/unit/" + this.props.unit} target="_blank">{this.props.unit}</a></div>
            </div>
            <div className="panel panel-default">
               <div className="panel-heading">得標廠商</div>
               <div className="panel-body">
                  {this.props.award.map(m => 
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
            <div className="panel panel-default">
               <div className="panel-heading">投標廠商</div>
               <div className="panel-body">
                  {(this.props.merchants || []).map(m => 
                  <div className="row col-xs-12">
                     <a href={"/merchants/" + m.name}>
                        {m.org} - {m.name}
                     </a>
                  </div>
                  )}
               </div>
            </div>

            <div className="panel panel-default">
               <div className="panel-heading">相關關鍵字</div>
               <div className="panel-body">
									{(this.props.tenders[0].tags || []).map((word , i) => 
										<span><a href={"/search/" + word}>{word}</a>{this.props.tenders[0].tags.length == i + 1 ? '': '、'}</span>
									)}
               </div>
            </div>
       </div>
       </div>
     )
   }
 }
