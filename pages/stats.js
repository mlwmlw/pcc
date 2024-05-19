import React from "react";
import dynamic from 'next/dynamic';
import Router from 'next/router'
import Head from 'next/head';
import { useState } from "react";
import { DataTable } from "../components/DataTable";
function LineChart({data, target, setTarget}) {
    const ResponsiveLine = dynamic(() => {
        return import('@nivo/bar').then((mod) => mod.ResponsiveBar)
    }, { ssr: false })
    var units = Object.keys(data).reduce((list, key) => {
        data[key].map( row => {
            if(!/政府/.test(row.parent) && row.parent_id && !/\d{5}/.test(row.parent_id))
                list.push(row.parent)
        })
        return list;
    }, [])
    
    units = [...new Set(units)];
    //units = ['數位發展部']
    let line = units.map((unit) => {
        return {
            id: unit, 
            data: Object.keys(data).map(function(key) {
                return {
                    x: key,
                    y: data[key].reduce((total, row) => {
                        if(row.parent == unit) 
                            total += +row.price
                        return total
                    }, 0)
                }
            })
        }
    })
    var total_units = {}
    let bar = Object.keys(data).map(function(key) {
        var res = data[key].reduce((total, row) => {
            var unit;
            
            if (!target) {
                unit = /政府/.test(row.parent) ? '縣市政府': row.parent
            } else if(target == row.parent) {
                unit = row._id
            } else if(target == '縣市政府') {
                unit = /政府/.test(row.parent) ? row.parent: null
            } 
            if(!unit) {
                return total
            }
            if(!total[unit]) {
                total[unit] = 0;
                total_units[unit] = {unit: unit, value: 0};
            } 
            
            total[unit] += +row.price
            total_units[unit].value += +row.price
            return total
        }, {});
        res.x = key
        return res;
    })
    
    total_units = Object.keys(total_units).map(key => total_units[key]).sort((a, b) => b.value - a.value);
    units = total_units.map(row => row.unit)
    
    console.log(total_units)
    return (
        <ResponsiveLine
            data={bar}
            indexBy="x" keys={units} groupMode="stacked" enableLabel={false}

            colors={["#3366cc", "#dc3912", "#ff9900", "#109618", "#990099", "#0099c6", "#dd4477", "#66aa00", "#b82e2e", "#316395", "#994499", "#22aa99", "#aaaa11", "#6633cc", "#e67300", "#8b0707", "#651067", "#329262", "#5574a6", "#3b3eac"]}
            
            margin={{
                top: 60,
                right: 160,
                bottom: 100,
                left: 50
            }}
            yScale={{
                type: 'linear',
                // stacked: true,
                reverse: false
            }}
            enableArea={true}
            enableSlices="x"

            // areaOpacity={1}
            axisLeft={{ 
                format: v => new Intl.NumberFormat('zh-TW', { notation: "compact" }).format(v) 
            }}
            useMesh={true}
            
            xScale={{
                type: "point",
                //precision: "year",
                //format: "%Y"
                //format: "native"
            }}
            axisBottom={{
                "tickSize": 5,
                "tickPadding": 5,
                "tickRotation": 45,
                
                "legendPosition": "middle",
                "legendOffset": 32
              }}
            legends={[
                {
                    anchor: 'bottom-right',
                    direction: 'column',
                    justify: false,
                    translateX: 140,
                    translateY: 0,
                    itemsSpacing: 0,
                    itemDirection: 'left-to-right',
                    itemWidth: 100,
                    itemHeight: 14,
                    
                    symbolSize: 12,
                    symbolShape: 'circle',
                    symbolBorderColor: 'rgba(0, 0, 0, .5)',
                    effects: [
                        {
                            on: 'hover',
                            style: {
                                itemBackground: 'rgba(0, 0, 0, .03)',
                                itemOpacity: 1
                            }
                        }
                    ]
                }
            ]}
            onClick={(row, event) => {
                setTarget(row.id)
                //Router.push(`/stats/${row.id}`)
            }}
        />
    );
}
async function getUnitsStats() {
    const res = await fetch("http://localhost:3000/api/units_stats/2023-01-01/2024-03-27")
    const stats = await res.json()
    return {stats}
}
async function getTender(unit, month) {
    if(!month) {
        month = '2023-12-01'
    }
    const res = await fetch(`http://localhost:3000/api/unit/${unit}/${month}`)
    const tenders = await res.json()
    console.log(unit, tenders)
    return tenders
}
function TenderTable(tenders) {
    const columns = [
        {
            header: "機關",
            accessorKey: "unit",
            cell: ({ row }) =>
            <a target="_blank" href={`/unit/${row.original.unit_id}`}>{row.original.unit}</a>
        },
        {
            header: "標案名稱",
            accessorKey: "name",
            cell: ({ row }) =>
            <a target="_blank" href={`/tender/${row.original.unit}/${row.original.job_number}`}>
                {row.original.name}
            </a>
        },
        {
            header: "招標日期",
            accessorKey: "publish",
        },
        {
            header: "得標公司",
            accessorKey: "merchants",
            filterMethod: (filter, row) => {
            return row[filter.id].filter((val) => {
                return val.indexOf(filter.value)  !== -1
            }).length
            },
            cell: ({ row }) =>
            { if (row.original.merchants.length == 0) {
                return null;
            } else {
                return <ul style={{
                    "listStyle": "circle", 
                    "paddingLeft": "20px"
                }}>
                {row.original.merchants.map(function(m) {
                    return <li key={m}>
                    <a target="_blank" href={`/merchants/${m}`}>{m}</a>
                    </li>
                })}
                </ul>
            }}
        }
    ]
    return <DataTable columns={columns} data={tenders} />
}
export const getServerSideProps = async (context) => {
    const props = await getUnitsStats()
    
    return {props: props}
}
export default function Page({stats}) {
    var path = ''
    if(typeof window !== 'undefined' && Router.asPath.split('/').length > 2) {
        path = decodeURIComponent(Router.asPath.split('/')[2])
    }
    const [target, setTarget] = useState(path);
    if(target) {
        console.log(target)
        var tenders = getTender(target);
    }
    return <>
        <Head>
            <title>開放政府標案</title>
            <meta name="description"
            content="開放政府標案目的是為了讓公民能更容易關心繳納的稅金，如何被分配與使用，持續監督政商之利害關係。提供各種統計數據與最新趨勢案件
            "/>
        </Head>
        <div className="container landing mx-auto">
            
            <div className="content-section-b">
                <div className="min-w-6xl max-w-screen-lg px-4 mx-auto">
                    <div className="row">
                        <div className="col-lg-12 col-sm-12" style={{height: 400}}>
                            <h2 className="section-heading">各月招標資料統計</h2>
                            <LineChart data={stats} target={target} setTarget={setTarget} />
                        </div>
                    </div>
                </div>
            </div>
            <div className="content-section-a">
                <div className="min-w-6xl max-w-screen-lg px-4 mx-auto">
                    <div className="row">
                        <div className="col-lg-5 col-sm-6">
                            <h2 className="section-heading">熱門瀏覽標案</h2>
                            <p className="lead">最近很多人關注的標案</p>
                        </div>
                        <div className="col-lg-5 col-lg-offset-2 col-sm-6">
                            <TenderTable tenders={tenders} />
                        </div>
                    </div>

                </div>
            </div>
            
    </div>
    </>

}

