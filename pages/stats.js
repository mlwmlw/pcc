import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import { DataTable } from '../components/DataTable';

const ResponsivePie = dynamic(() => import('@nivo/pie').then(mod => mod.ResponsivePie), {
    ssr: false,
    loading: () => <p style={{ height: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>圖表載入中...</p>,
});

const ResponsiveLine = dynamic(() => import('@nivo/line').then(mod => mod.ResponsiveLine), {
    ssr: false,
    loading: () => <p style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>圖表載入中...</p>,
});

const stringifyMongoId = (item) => {
    if (!item) {
        return item;
    }
    if (typeof item === 'object' && item._id && typeof item._id.toString === 'function') {
        return { ...item, _id: item._id.toString() };
    }
    return item;
};

const API_HOST = "http://localhost:8888";

export async function getServerSideProps(context) {
    let monthes = [];
    let initialStatsData = [];
    let error = null;
    let initialSelectedMonthData = null;

    try {
        console.error(`${API_HOST}/month`)

        const monthRes = await fetch(`${API_HOST}/month`); // 使用 /api 前綴
        if (!monthRes.ok) throw new Error(`Failed to fetch months: ${monthRes.status} ${monthRes.statusText}`);
        const rawMonthes = await monthRes.json();
        monthes = rawMonthes.sort((a, b) => {
            if (a.year !== b.year) return b.year - a.year;
            return b.month - a.month;
        }).map(m => ({ ...m, id: `${m.year}-${m.month.toString().padStart(2, '0')}` }));

        if (monthes.length > 0) {
            initialSelectedMonthData = monthes[0];
            const { year, month } = initialSelectedMonthData;
            const dateStr = `${year}-${month.toString().padStart(2, '0')}-01`;
            const statsRes = await fetch(`${API_HOST}/units_stats/${dateStr}`); // 使用 /api 前綴
            if (!statsRes.ok) throw new Error(`Failed to fetch initial stats for ${dateStr}: ${statsRes.status} ${statsRes.statusText}`);
            initialStatsData = await statsRes.json();
        }

    } catch (e) {

        console.error("Error in getServerSideProps (stats.js):", e.message);
        error = e.message || "Failed to load initial data.";
    }

    return {
        props: {
            monthes: monthes.map(stringifyMongoId),
            initialStats: Array.isArray(initialStatsData) ? initialStatsData.map(stringifyMongoId) : [],
            initialSelectedMonthData: initialSelectedMonthData ? stringifyMongoId(initialSelectedMonthData) : null,
            initialUnitTenders: [], // initialUnitTenders is fetched on client side based on interaction
            error,
        },
    };
}

const StatsPage = ({ monthes, initialStats, initialSelectedMonthData, error }) => { // Removed initialUnitTenders from props
    const router = useRouter();
    const [selectedMonthData, setSelectedMonthData] = useState(initialSelectedMonthData);
    const [statsType, setStatsType] = useState('price');
    const [currentRawStats, setCurrentRawStats] = useState(initialStats); // Store current month's raw stats
    const [statsDataForPie, setStatsDataForPie] = useState([]);
    const [unitTenders, setUnitTenders] = useState([]); // Initialize as empty
    const [currentBreadcrumb, setCurrentBreadcrumb] = useState(['全部']);
    const [currentUnit, setCurrentUnit] = useState(null);
    const [loadingTenders, setLoadingTenders] = useState(false);
    const [chartType, setChartType] = useState('line');
    const [trendData, setTrendData] = useState([]);

    const processStatsForPie = useCallback((stats, type, parentUnit = null) => {
        if (!stats || stats.length === 0) return [];
        const aggregated = {};
        stats.forEach(item => {
            const key = parentUnit ? item.unit : item.parent;
            if (!key || key === "") return;
            if (parentUnit && item.parent !== parentUnit) return;
            if (!aggregated[key]) {
                aggregated[key] = { price: 0, count: 0 };
            }
            aggregated[key].price += Number(item.price) || 0;
            aggregated[key].count += Number(item.count) || 0;
        });
        return Object.entries(aggregated)
            .map(([name, values]) => ({ id: name, label: name, value: values[type] || 0 }))
            .filter(item => item.value > 0)
            .sort((a, b) => b.value - a.value)
            .slice(0, 15);
    }, []);

    const processTrendData = useCallback((stats) => {
        if (!stats) return [];
        
        const aggregated = {};
        Object.entries(stats).forEach(([date, units]) => {
            units.forEach(unit => {
                if (!unit.parent || unit.parent === '') return;
                
                if (!aggregated[unit.parent]) {
                    aggregated[unit.parent] = {
                        id: unit.parent,
                        data: []
                    };
                }
                
                const existingData = aggregated[unit.parent].data.find(d => d.x === date);
                if (existingData) {
                    existingData.y += Number(unit[statsType]) || 0;
                } else {
                    aggregated[unit.parent].data.push({
                        x: date,
                        y: Number(unit[statsType]) || 0
                    });
                }
            });
        });

        return Object.values(aggregated)
            .sort((a, b) => {
                const sumA = a.data.reduce((sum, point) => sum + point.y, 0);
                const sumB = b.data.reduce((sum, point) => sum + point.y, 0);
                return sumB - sumA;
            })
            .slice(0, 15);
    }, [statsType]);

    useEffect(() => {
        // Initialize pie data with currentRawStats (which is initialStats on first load)
        setStatsDataForPie(processStatsForPie(currentRawStats, statsType, currentBreadcrumb.length > 1 ? currentBreadcrumb[currentBreadcrumb.length - 1] : null));
    }, [currentRawStats, statsType, processStatsForPie, currentBreadcrumb]);

    useEffect(() => {
        const fetchTrendData = async () => {
            try {
                // const startDate = "2018-01-01";
                //startDate is current date sub 12 month first day
                const startDate = new Date();
                startDate.setMonth(startDate.getMonth() - 12);
                startDate.setDate(1); 
                const startDateStr = startDate.toISOString().slice(0, 10);
                //endDate is current date
                const endDate = new Date().toISOString().slice(0, 10);
                const res = await fetch(`${API_HOST}/units_stats/${startDateStr}/${endDate}`);
                if (!res.ok) throw new Error(`Failed to fetch trend data: ${res.status}`);
                const data = await res.json();
                const processedData = processTrendData(data);
                setTrendData(processedData);
            } catch (error) {
                console.error("Error fetching trend data:", error);
                setTrendData([]);
            }
        };
        
        fetchTrendData();
    }, [processTrendData, statsType]);


    const handleMonthChange = async (event) => {
        const selectedId = event.target.value;
        const newSelectedMonth = monthes.find(m => m.id === selectedId);
        if (newSelectedMonth) {
            setSelectedMonthData(newSelectedMonth);
            setCurrentBreadcrumb(['全部']);
            setCurrentUnit(null);
            setUnitTenders([]);
            try {
                const { year, month } = newSelectedMonth;
                const dateStr = `${year}-${month.toString().padStart(2, '0')}-01`;
                const statsRes = await fetch(`${API_HOST}/units_stats/${dateStr}`); // 使用 /api 前綴
                console.log(`${API_HOST}/units_stats/${dateStr}`)
                if (!statsRes.ok) throw new Error(`Failed to fetch stats for ${dateStr}: ${statsRes.status} ${statsRes.statusText}`);
                const newStats = await statsRes.json();
                setCurrentRawStats(Array.isArray(newStats) ? newStats : []); // Update currentRawStats
            } catch (e) {
                console.error("Error fetching new month stats:", e.message);
                setCurrentRawStats([]);
            }
        }
    };

    const handleStatsTypeChange = (event) => {
        const newType = event.target.value;
        setStatsType(newType);
        // Pie data will re-calculate via useEffect listening to statsType and currentRawStats
    };

    const handlePieClick = async (node) => {
        const clickedUnit = node.id;
        const canDrillDown = currentRawStats.some(item => item.parent === clickedUnit);

        if (canDrillDown && currentBreadcrumb[currentBreadcrumb.length - 1] !== clickedUnit) {
            setCurrentBreadcrumb([...currentBreadcrumb, clickedUnit]);
            // Pie data will re-calculate via useEffect listening to currentBreadcrumb and currentRawStats
            setCurrentUnit(clickedUnit);
            setUnitTenders([]);
        } else {
            setCurrentUnit(clickedUnit);
            setLoadingTenders(true);
            try {
                const { year, month } = selectedMonthData;
                const monthStr = `${year}-${month.toString().padStart(2, '0')}`;
                const tendersRes = await fetch(`${API_HOST}/unit/${encodeURIComponent(clickedUnit)}/${monthStr}`); // 使用 /api 前綴
                if (!tendersRes.ok) throw new Error(`Failed to fetch tenders for ${clickedUnit}: ${tendersRes.status} ${tendersRes.statusText}`);
                const tendersData = await tendersRes.json();
                setUnitTenders(tendersData.map(stringifyMongoId));
            } catch (e) {
                console.error("Error fetching unit tenders:", e.message);
                setUnitTenders([]);
            } finally {
                setLoadingTenders(false);
            }
        }
    };
    
    const handleBreadcrumbClick = (index) => {
        const newBreadcrumb = currentBreadcrumb.slice(0, index + 1);
        setCurrentBreadcrumb(newBreadcrumb);
        const newCurrentUnit = index === 0 ? null : newBreadcrumb[newBreadcrumb.length - 1];
        setCurrentUnit(newCurrentUnit);
        setUnitTenders([]);
        // Pie data will re-calculate via useEffect listening to currentBreadcrumb
    };

    if (error) {
        return <div className="container mx-auto p-4"><p className="text-red-500">資料載入錯誤: {error}</p></div>;
    }

    const tenderTableColumns = [
        { header: "標案名稱", accessorKey: "name", cell: ({ row }) => <a target="_blank" rel="noopener noreferrer" href={`/tender/${row.original.unit_id || row.original.unit}/${row.original.job_number}`}>{row.original.name}</a> },
        { header: "招標日期", accessorKey: "publish", cell: ({row}) => row.original.publish ? new Date(row.original.publish).toLocaleDateString() : ''},
        { header: "標案金額", accessorKey: "price", cell: ({ row }) => row.original.price ? `$${Number(row.original.price).toLocaleString()}` : '未提供' },
        { header: "得標廠商", accessorKey: "award.merchants", cell: ({ row }) => {
            const merchants = row.original.award?.merchants;
            if (!merchants || merchants.length === 0) return '無';
            return (
                <ul className="list-disc list-inside">
                    {merchants.map(m => (
                        <li key={m._id || m.name}>
                            <a target="_blank" rel="noopener noreferrer" href={`/merchants/${m._id || m.name}`}>{m.name}</a>
                            {m.amount && ` ($${Number(m.amount).toLocaleString()})`}
                        </li>
                    ))}
                </ul>);
            }
        },
    ];

    return (
        <>
            <Head>
                <title>政府標案統計</title>
                <meta name="description" content="政府標案統計數據，包含各單位招標金額與數量分析" />
            </Head>
            <div className="container mx-auto p-4">
                <h1 className="text-2xl font-bold mb-4">各月招標資料統計</h1>
                <p className="mb-2">此功能用來大致分析每個單位所得到的資源數量，各單位可以再點擊進去看詳細。</p>
                <p className="mb-4 text-sm text-gray-600">註：目前相同標案若在不同月份重新發標可能會被重複計算。部分標案可能未提供發標金額，建議參考標案數量進行比較。</p>

                <div className="my-4 p-4 border rounded shadow">
                    <div className="mb-4">
                        <select 
                            value={chartType} 
                            onChange={(e) => setChartType(e.target.value)}
                            className="p-2 border border-gray-300 rounded-md shadow-sm"
                        >
                            <option value="line">折線圖</option>
                            <option value="area">面積圖</option>
                        </select>
                    </div>
                    <div style={{ height: '400px' }} className="bg-white rounded p-2">
                        {trendData.length > 0 ? (
                            <ResponsiveLine
                                data={trendData}
                                margin={{ top: 20, right: 180, bottom: 50, left: 80 }}
                                xScale={{
                                    type: 'time',
                                    format: '%Y-%m-%d',
                                    useUTC: false,
                                    precision: 'month'
                                }}
                                yScale={{
                                    type: 'linear',
                                    stacked: chartType === 'area',
                                }}
                                axisBottom={{
                                    format: '%Y-%m',
                                    tickRotation: -45,
                                    tickValues: 'every 3 months',
                                }}
                                axisLeft={{
                                    tickSize: 5,
                                    tickPadding: 5,
                                    format: value => statsType === 'price' ? 
                                        `$${Number(value).toLocaleString()}` : 
                                        Number(value).toLocaleString(),
                                }}
                                enablePoints={false}
                                enableArea={chartType === 'area'}
                                areaOpacity={0.15}
                                enableSlices="x"
                                curve="monotoneX"
                                legends={[
                                    {
                                        anchor: 'right',
                                        direction: 'column',
                                        justify: false,
                                        translateX: 140,
                                        translateY: 0,
                                        itemsSpacing: 2,
                                        itemWidth: 100,
                                        itemHeight: 20,
                                        symbolSize: 12,
                                        symbolShape: 'circle',
                                    }
                                ]}
                                theme={{
                                    axis: {
                                        ticks: {
                                            text: {
                                                fontSize: 11
                                            }
                                        }
                                    }
                                }}
                            />
                        ) : <p className="text-center py-10">載入趨勢資料中...</p>}
                    </div>
                </div>
                <div className="my-4 p-4 border rounded shadow">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label htmlFor="month-select" className="block text-sm font-medium text-gray-700">選擇月份：</label>
                            <select id="month-select" value={selectedMonthData?.id || ''} onChange={handleMonthChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm">
                                {monthes.map(m => <option key={m.id} value={m.id}>{m.name || m.id}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="stats-type-select" className="block text-sm font-medium text-gray-700">統計類型：</label>
                            <select id="stats-type-select" value={statsType} onChange={handleStatsTypeChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm">
                                <option value="price">金額</option>
                                <option value="count">標案數量</option>
                            </select>
                        </div>
                    </div>

                    <div className="my-2">
                        <ol className="flex flex-wrap list-none p-0">
                            {currentBreadcrumb.map((crumb, index) => (
                                <li key={index} className="breadcrumb-item">
                                    <button 
                                        onClick={() => handleBreadcrumbClick(index)}
                                        className={`p-1 hover:underline ${index === currentBreadcrumb.length - 1 ? 'text-gray-500 cursor-default' : 'text-blue-600'}`}
                                        disabled={index === currentBreadcrumb.length - 1}
                                    >
                                        {crumb}
                                    </button>
                                    {index < currentBreadcrumb.length - 1 && <span className="mx-1">/</span>}
                                </li>
                            ))}
                        </ol>
                    </div>

                    <div style={{ height: '500px' }} className="bg-white rounded p-2">
                        {statsDataForPie.length > 0 ? (
                            <ResponsivePie
                                data={statsDataForPie}
                                margin={{ top: 40, right: 80, bottom: 80, left: 80 }}
                                innerRadius={0.5}
                                padAngle={0.7}
                                cornerRadius={3}
                                activeOuterRadiusOffset={8}
                                borderWidth={1}
                                borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                                arcLinkLabelsSkipAngle={10}
                                arcLinkLabelsTextColor="#333333"
                                arcLinkLabelsThickness={2}
                                arcLinkLabelsColor={{ from: 'color' }}
                                arcLabelsSkipAngle={10}
                                arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
                                onClick={handlePieClick}
                                tooltip={({ datum: { id, value, color } }) => (
                                    <strong style={{ color }}>
                                        {id}: {statsType === 'price' ? `$${Number(value).toLocaleString()}` : Number(value).toLocaleString()}
                                    </strong>
                                )}
                            />
                        ) : <p className="text-center py-10">此條件下無資料可顯示於圓餅圖。</p>}
                    </div>
                </div>

                
                {currentUnit && (
                    <div className="mt-8">
                        <h2 className="text-xl font-semibold mb-2">
                            {currentUnit} - {selectedMonthData?.name || selectedMonthData?.id} - 詳細標案列表
                        </h2>
                        {loadingTenders ? <p>載入中...</p> : (
                            unitTenders.length > 0 ? 
                            <DataTable columns={tenderTableColumns} data={unitTenders} /> : 
                            <p>此單位在此月份無標案資料。</p>
                        )}
                    </div>
                )}
            </div>
        </>
    );
};

export default StatsPage;
