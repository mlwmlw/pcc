import React from "react";
import { ResponsiveCalendar } from '@nivo/calendar'

export default class extends React.Component {
    constructor(props) {
        super(props);
    }
    static async getInitialProps({ req, query, params}) {
        let host = "https://pcc.mlwmlw.org" || "http://localhost:3000";
        const tenders_res = await fetch(host + "/api/hot/tenders");
        const tenders = await tenders_res.json();

        const units_res = await fetch(host + "/api/hot/unit");
        const units = await units_res.json();
        
        const merchants_res = await fetch(host + "/api/hot/merchant");
        const merchants = await merchants_res.json();

        const news_res = await fetch(host + "/api/news");
        const news = await news_res.text();

        const dates_res = await fetch(host + "/api/dates");
        let dates = await dates_res.json();
        dates = Object.keys(dates).map(day => {
            return {"day": day, "value": dates[day]}
        })
        return {tenders, units, merchants, news, dates}
    }    
    render() {
        let {tenders, units, merchants, news, dates} = this.props;
        let end = dates[0].day, start = dates[100].day;
        return <>
            <title>開放政府標案</title>
            <meta name="description"
            content="開放政府標案目的是為了讓公民能更容易關心繳納的稅金，如何被分配與使用，持續監督政商之利害關係。提供各種統計數據與最新趨勢案件
            "/>
            <div className="container landing">
            <div className="intro-header">
                <div className="container">
                    <div className="row">
                        <div className="col-lg-12" style={{"background": "rgba(0,0,0,0.7)", "padding": "1px 10px 8px 10px"}}>
                            <div className="intro-message">
                                <h1>開放標案</h1>
                                <h3>讓公民更容易關心繳納的稅金，如何被分配與使用，持續監督政商之利害關係。</h3>
                            </div>
                        </div>
                    </div>
                </div>
                </div>
                <div className="content-section-b">
                    <div className="container">
                        <div className="row">
                            <div className="col-lg-12   col-sm-12" style={{height: 200}}>
                                <h2 className="section-heading">最新日期標案</h2>
                                <ResponsiveCalendar
                                    data={dates}
                                    from={start}
                                    to={end}
                                    emptyColor="#eeeeee"
                                    colors={[ '#61cdbb', '#97e3d5', '#e8c1a0', '#f47560' ]}
                                    margin={{ top: 40, right: 40, bottom: 40, left: 40 }}
                                    yearSpacing={40}
                                    monthBorderColor="#ffffff"
                                    dayBorderWidth={2}
                                    dayBorderColor="#ffffff"
                                    onClick={row => {
                                        location.href = "/date/tender/" + row.day
                                    }}
                                    legends={[
                                        {
                                            anchor: 'bottom-right',
                                            direction: 'row',
                                            translateY: 36,
                                            itemCount: 4,
                                            itemWidth: 42,
                                            itemHeight: 36,
                                            itemsSpacing: 14,
                                            itemDirection: 'right-to-left'
                                        }
                                    ]}
                                />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="content-section-a">
                    <div className="container">
                        <div className="row">
                            <div className="col-lg-5 col-sm-6">
                                <h2 className="section-heading">熱門瀏覽標案</h2>
                                <p className="lead">最近很多人關注的標案</p>
                            </div>
                            <div className="col-lg-5 col-lg-offset-2 col-sm-6">
                                <ul style={{"marginLeft": "20px", "listStyle": "circle"}}>
                                    { tenders.map((tender) => {
                                        return <li>
                                            <a target="_blank" href={"/tender/" + tender.unit + "/" + tender.job_number}>{tender.name}</a>
                                        </li>
                                    })}
                                </ul>
                            </div>
                        </div>

                    </div>
                </div>
                <div className="content-section-b">
                    <div className="container">
                        <div className="row">
                            <div className="col-lg-5 col-lg-offset-1 col-sm-push-6 col-sm-6">
                                <h2 className="section-heading">熱門瀏覽單位</h2>
                                <p className="lead">最近很多人關注的單位</p>
                            </div>
                            <div className="col-lg-5 col-sm-pull-6 col-sm-6">
                                <ul style={{"marginLeft": "20px", "listStyle": "circle"}}>
                                    { units.map((u) => {
                                        return <li>
                                            <a target="_blank" href={"/unit/" + u.unit}>{u.name}</a>
                                        </li>
                                    })}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="content-section-a">
                    <div className="container">
                        <div className="row">
                            <div className="col-lg-5 col-sm-6">
                                <h2 className="section-heading">熱門瀏覽公司</h2>
                                <p className="lead">最近很多人關注的公司</p>
                            </div>
                            <div className="col-lg-5 col-lg-offset-2 col-sm-6">
                                <ul style={{"marginLeft": "20px", "listStyle": "circle"}}>
                                    { merchants.map((m) => {
                                        return <li>
                                            <a target="_blank" href={"/merchants/" + m.merchant}>{m.name}</a>
                                        </li>
                                    })}
                                </ul>
                            </div>
                        </div>

                    </div>

                </div>
                <div className="content-section-b">
                    <div className="container">
                        <div className="row">
                            <div className="col-lg-5 col-lg-offset-1 col-sm-push-6 col-sm-6">
                                <hr className="section-heading-spacer" />
                                <div className ="clearfix"></div>
                                <h2 className ="section-heading"><a href="#">最新弊案</a></h2>
                                <p className ="lead">最近上新聞事件的弊案的政府單位與得標廠商</p>
                            </div>
                            <div dangerouslySetInnerHTML={{__html: news}} style={{"height": "300px","overflow": "scroll"}} className="col-lg-5 col-sm-pull-6 col-sm-6">
                            </div>
                        </div>
                    </div>

                </div>

                <div className="content-section-a">
                    <div className="container">
                        <div className="row">
                            <div className="col-lg-5 col-sm-6">
                                <hr className="section-heading-spacer" />
                                <div className ="clearfix"></div>
                                <h2 className ="section-heading"><a href="/stats">分月追蹤預算使用</a></h2>
                                <p className ="lead">依照各單位統計，每個月各政院於標案上的預算花費。</p>
                            </div>
                            <div className="col-lg-5 col-lg-offset-2 col-sm-6">
                                <img style={{"padding":"50px 0"}} className="img-responsive" src="/static/line.png" alt="" />
                            </div>
                        </div>

                    </div>

                </div>
                <div className="content-section-b">
                    <div className="container">
                        <div className="row">
                            <div className="col-lg-5 col-lg-offset-1 col-sm-push-6  col-sm-6">
                                <hr className="section-heading-spacer" />
                                <div className ="clearfix"></div>
                                <h2 className ="section-heading"><a href="/stats">單位經費比例</a></h2>
                                <p className ="lead">檢視單月份各單位的標案預算的分配比例，可點擊檢視該單位詳細分配。</p>
                            </div>
                            <div className="col-lg-5 col-sm-pull-6  col-sm-6">
                                <img className="img-responsive" src="/static/pie.png" alt="" />
                            </div>
                        </div>
                    </div>

                </div>
                <div className="content-section-a">
                    <div className="container">
                        <div className="row">
                            <div className="col-lg-5 col-sm-6">
                                <hr className="section-heading-spacer" />
                                <div className="clearfix"></div>
                                <h2 className="section-heading">得標廠商</h2>
                                <p className="lead">
                                    瀏覽各參與標案<a href="/merchants">投標廠商</a>得標案件情況，
                                    與<a href="units">機關</a>間的利益關係。依照年度統計的<a href="/rank/partner">得標關係排行榜</a>
                                </p>
                        </div>
                        <div className="col-lg-5 col-lg-offset-2 col-sm-6">
                            <img className="img-responsive" src="/static/unit.png" alt="" />
                        </div>
                    </div>

                </div>

            </div>
            <div className="content-section-b">
                <div className="container">
                    <div className="row">
                        <div className="col-lg-5 col-lg-offset-1 col-sm-push-6  col-sm-6">
                            <hr className="section-heading-spacer" />
                            <div className ="clearfix"></div>
                            <h2 className ="section-heading">各式排行榜</h2>
                            <p className ="lead">依照月份統計，各重大建設的<a href="/rank/tender">招標情形</a>，與政府有重大金錢往來的<a href="/rank/merchant">得標廠商</a></p>
                        </div>
                        <div className="col-lg-5 col-sm-pull-6  col-sm-6">
                            <img className="img-responsive" src="/static/rank.png" alt="" />
                        </div>
                    </div>
                </div>

            </div>
            <div className="row">
                <div className="col-lg-12 text-center">
                    <h2 className="section-heading">About</h2>
                    <h3 className="section-subheading text-muted"></h3>
                </div>
            </div>
            <div className="col-lg-12">
                <ul className="timeline">
                    <li>
                        <div className="timeline-image">
                            <img className="img-circle img-responsive" src="https://secure.gravatar.com/avatar/0b57b8c75cfe984475b94fe0847f7665?s=200" alt="mlwmlw" />
                        </div>
                        <div className="timeline-panel">
                            <div className="timeline-heading">
                                <h4>mlwmlw</h4>
                                <h4 className="subheading"><a href="https://mlwmlw.org/">http://mlwmlw.org</a></h4>
                            </div>
                            <div className="timeline-body">
                                <p className="text-muted">會對電腦講話的貓</p>
                            </div>
                        </div>
                    </li>
                </ul>
            </div>
        </div>
        </>
    }
}

