import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { DataTable } from '../components/DataTable';
import { getApiUrl } from '../utils/api';
import dynamic from 'next/dynamic';

const AreaChart = dynamic(() => import('recharts').then(m => m.AreaChart), { ssr: false });
const Area = dynamic(() => import('recharts').then(m => m.Area), { ssr: false });
const LineChart = dynamic(() => import('recharts').then(m => m.LineChart), { ssr: false });
const Line = dynamic(() => import('recharts').then(m => m.Line), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(m => m.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false });
const Legend = dynamic(() => import('recharts').then(m => m.Legend), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false });
const PieChart = dynamic(() => import('recharts').then(m => m.PieChart), { ssr: false });
const Pie = dynamic(() => import('recharts').then(m => m.Pie), { ssr: false });
const Cell = dynamic(() => import('recharts').then(m => m.Cell), { ssr: false });

const dark24 = [
    '#1F77B4', '#FF7F0E', '#2CA02C', '#D62728', '#9467BD', '#8C564B', 
    '#E377C2', '#7F7F7F', '#BCBD22', '#17BECF', '#AEC7E8', '#FFBB78', 
    '#98DF8A', '#FF9896', '#C5B0D5', '#C49C94', '#F7B6D2', '#C7C7C7', 
    '#DBDB8D', '#9EDAE5', '#393B79', '#637939', '#8C6D31', '#843C39'
];

const stringifyMongoId = (item) => {
    if (!item) {
        return item;
    }
    if (typeof item === 'object' && item._id && typeof item._id.toString === 'function') {
        return { ...item, _id: item._id.toString() };
    }
    return item;
};

export async function getServerSideProps(context) {
    let monthes = [];
    let initialStatsData = [];
    let error = null;
    let initialSelectedMonthData = null;

    try {
        const monthRes = await fetch(getApiUrl('/month')); // 使用 /api 前綴
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
            const statsRes = await fetch(getApiUrl(`/units_stats/${dateStr}`)); // 使用 /api 前綴
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

const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkIfMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkIfMobile();
        window.addEventListener('resize', checkIfMobile);

        return () => {
            window.removeEventListener('resize', checkIfMobile);
        };
    }, []);

    return isMobile;
};

const StatsPage = ({ monthes, initialStats, initialSelectedMonthData, error }) => { // Removed initialUnitTenders from props
    const router = useRouter();
    const isMobile = useIsMobile();
    const [selectedMonthData, setSelectedMonthData] = useState(initialSelectedMonthData);
    const [statsType, setStatsType] = useState('price');
    const [currentRawStats, setCurrentRawStats] = useState(initialStats); // Store current month's raw stats
    const [statsDataForPie, setStatsDataForPie] = useState({ data: [], total: 0 });
    const [unitTenders, setUnitTenders] = useState([]); // Initialize as empty
    const [currentBreadcrumb, setCurrentBreadcrumb] = useState(['全部']);
    const [currentUnit, setCurrentUnit] = useState(null);
    const [loadingTenders, setLoadingTenders] = useState(false);
    const [chartType, setChartType] = useState('line');
    const [trendData, setTrendData] = useState([]);
    const [visibleSeries, setVisibleSeries] = useState({});
    const [highlightedSeries, setHighlightedSeries] = useState(null);

    const processStatsForPie = useCallback((stats, type, parentUnit = null) => {
        if (!stats || stats.length === 0) return { data: [], total: 0 };
        const aggregated = {};
        let total = 0;

        stats.forEach(item => {
            const key = parentUnit ? item.unit : item.parent;
            if (!key || key === "") return;
            if (parentUnit && item.parent !== parentUnit) return;
            const value = type === 'price' ? Number(item.price) || 0 : Number(item.count) || 0;
            total += value;
            if (!aggregated[key]) {
                aggregated[key] = 0;
            }
            aggregated[key] += value;
        });

        return {
            data: Object.entries(aggregated)
                .map(([name, value]) => ({ id: name, label: name, value }))
                .filter(item => item.value > 0)
                .sort((a, b) => b.value - a.value)
                .slice(0, 20),
            total
        };
    }, []);

    const processTrendData = useCallback((stats) => {
        if (!stats) return [];
        
        // 首先收集所有日期和單位
        const dates = new Set();
        const units = new Set();
        const valuesByDateAndUnit = {};

        Object.entries(stats).forEach(([date, dateUnits]) => {
            dates.add(date);
            dateUnits.forEach(unit => {
                if (!unit.parent || unit.parent === '') return;
                units.add(unit.parent);
                
                const key = `${date}-${unit.parent}`;
                if (!valuesByDateAndUnit[key]) {
                    valuesByDateAndUnit[key] = 0;
                }
                valuesByDateAndUnit[key] += Number(unit[statsType]) || 0;
            });
        });

        // 轉換成圖表需要的格式
        const sortedDates = Array.from(dates).sort();
        const formattedData = sortedDates.map(date => {
            const dataPoint = { date };
            units.forEach(unit => {
                dataPoint[unit] = valuesByDateAndUnit[`${date}-${unit}`] || 0;
            });
            return dataPoint;
        });

        // 計算並排序總量以只保留前15個單位
        const unitTotals = Array.from(units).map(unit => ({
            unit,
            total: sortedDates.reduce((sum, date) => sum + (valuesByDateAndUnit[`${date}-${unit}`] || 0), 0)
        }));

        const topUnits = unitTotals
            .sort((a, b) => b.total - a.total)
            .map(item => item.unit);
        const finalData = formattedData.map(point => {
            const filtered = { date: point.date };
            topUnits.forEach(unit => {
                filtered[unit] = point[unit];
            });
            return filtered;
        });

        return {
            data: finalData,
            units: topUnits
        };
    }, [statsType]);

    useEffect(() => {
        // Initialize pie data with currentRawStats (which is initialStats on first load)
        setStatsDataForPie(processStatsForPie(currentRawStats, statsType, currentBreadcrumb.length > 1 ? currentBreadcrumb[currentBreadcrumb.length - 1] : null));
    }, [currentRawStats, statsType, processStatsForPie, currentBreadcrumb]);

    useEffect(() => {
        // 初始化 visibleSeries，只顯示前5個系列
        if (trendData?.units) {
            const initialVisibility = {};
            trendData.units.forEach((unit, index) => {
                initialVisibility[unit] = index < 15;  // 顯示前15個
            });
            setVisibleSeries(initialVisibility);
        }
    }, [trendData]);

    const handleLegendMouseEnter = useCallback((o) => {
        const { dataKey } = o;
        setHighlightedSeries(dataKey);
    }, []);

    const handleLegendMouseLeave = useCallback(() => {
        setHighlightedSeries(null);
    }, []);

    const handleLegendClick = useCallback((o) => {}, []);

    useEffect(() => {
        const fetchTrendData = async () => {
            try {
                // const startDate = "2018-01-01";
                //startDate is current date sub 12 month first day
                const startDate = new Date();
                startDate.setMonth(startDate.getMonth() - 36);
                startDate.setDate(1); 
                const startDateStr = startDate.toISOString().slice(0, 10);
                //endDate is current date
                const endDate = new Date().toISOString().slice(0, 10);
                const res = await fetch(getApiUrl(`/units_stats/${startDateStr}/${endDate}`));
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
                const statsRes = await fetch(getApiUrl(`/units_stats/${dateStr}`)); // 使用 /api 前綴
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
                const tendersRes = await fetch(getApiUrl(`/unit/${encodeURIComponent(clickedUnit)}/${monthStr}`)); // 使用 /api 前綴
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
                <title>各月招標資料統計 - 開放政府標案</title>
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
                    <div style={{ height: isMobile ? '580px' : '500px' }} className="bg-white rounded p-1">
                        {trendData?.data ? (
                            <ResponsiveContainer>
                                {chartType === 'area' ? (
                                    <AreaChart
                                        data={trendData?.data || []}
                                        margin={{ top: 10, right: 10, bottom: 0, left: 25 }}
                                >
                                    <defs>
                                        {trendData?.units.map((unit, index) => (
                                            <linearGradient key={unit} id={`color${index}`} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={dark24[index % dark24.length]} stopOpacity={1}/>
                                                <stop offset="95%" stopColor={dark24[index % dark24.length]} stopOpacity={0.8}/>
                                            </linearGradient>
                                        ))}
                                    </defs>
                                    <XAxis 
                                        dataKey="date" 
                                        angle={-45}
                                        tickFormatter={(value) => {
                                            const date = new Date(value);
                                            return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`;
                                        }}
                                        height={75}
                                        dy={0}
                                        tick={{fontSize: 12}}
                                        interval={1}
                                        textAnchor="end"
                                    />
                                    <YAxis
                                        tickFormatter={(value) => 
                                            statsType === 'price' 
                                                ? value >= 1000000000 
                                                    ? `${(value/1000000000).toFixed(0)}B`
                                                    : value >= 1000000 
                                                        ? `${(value/1000000).toFixed(0)}M`
                                                        : `${(value/1000).toFixed(0)}k`
                                                : value >= 1000 
                                                    ? `${(value/1000).toFixed(0)}k`
                                                    : value.toString()
                                        }
                                        tickSize={3}
                                        dx={-2}
                                        width={25}
                                        tickMargin={2}
                                        orientation="left"
                                        axisLine={false}
                                        tick={{ fontSize: 11, fill: '#666' }}
                                    />
                                    <CartesianGrid strokeDasharray="2 4" stroke="#f0f0f0" strokeOpacity={0.8} vertical={false} />
                                    <Tooltip
                                        formatter={(value, name) => [
                                            statsType === 'price'
                                                ? `$${Number(value).toLocaleString()}`
                                                : Number(value).toLocaleString(),
                                            name
                                        ]}
                                        labelFormatter={(value) => {
                                            const date = new Date(value);
                                            return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`;
                                        }}
                                    />
                                    <Legend 
                                        layout="vertical" 
                                        align="right" 
                                        verticalAlign="middle"
                                        iconType="circle"
                                        onMouseEnter={handleLegendMouseEnter}
                                        onMouseLeave={handleLegendMouseLeave}
                                        onClick={handleLegendClick}
                                        wrapperStyle={{
                                            paddingLeft: "8px",
                                            right: 0,
                                            backgroundColor: "white",
                                            padding: "6px 8px",
                                            border: "1px solid #f0f0f0",
                                            borderRadius: "4px",
                                            fontSize: "12px",
                                            cursor: "default"
                                        }}
                                    />
                                    {trendData?.units.map((unit, index) => (
                                        visibleSeries[unit] && <Area
                                            key={unit}
                                            dataKey={unit}
                                            stackId="1"
                                            name={unit}
                                            stroke={dark24[index % dark24.length]}
                                            fill={`url(#color${index})`}
                                            style={{
                                                opacity: highlightedSeries ? (highlightedSeries === unit ? 1 : 0.3) : 1
                                            }}
                                        />
                                    ))}
                                </AreaChart>
                                ) : (
                                    <LineChart
                                        data={trendData?.data || []}
                                        margin={{ top: 10, right: 10, bottom: 0, left: 25 }}
                                    >
                                        <defs>
                                        {trendData?.units.map((unit, index) => (
                                            <linearGradient key={unit} id={`color${index}`} x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={dark24[index % dark24.length]} stopOpacity={0.9}/>
                                                    <stop offset="95%" stopColor={dark24[index % dark24.length]} stopOpacity={0.2}/>
                                                </linearGradient>
                                            ))}
                                        </defs>
                                        <XAxis 
                                            dataKey="date" 
                                            angle={-45}
                                            tickFormatter={(value) => {
                                                const date = new Date(value);
                                                return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`;
                                            }}
                                            height={75}
                                            dy={0}
                                            tick={{fontSize: 12}}
                                            interval={1}
                                            textAnchor="end"
                                        />
                                        <YAxis
                                            tickFormatter={(value) => 
                                                statsType === 'price' 
                                                    ? value >= 1000000000 
                                                        ? `${(value/1000000000).toFixed(1)}B`
                                                        : value >= 1000000 
                                                            ? `${(value/1000000).toFixed(0)}M`
                                                            : `${(value/1000).toFixed(0)}k`
                                                    : value >= 1000 
                                                        ? `${(value/1000).toFixed(0)}k`
                                                        : value.toString()
                                            }
                                            tickSize={3}
                                            dx={-2}
                                            width={25}
                                            tickMargin={2}
                                            orientation="left"
                                            axisLine={false}
                                            tick={{ fontSize: 11, fill: '#666' }}
                                        />
                                        <CartesianGrid strokeDasharray="2 4" stroke="#f0f0f0" strokeOpacity={0.8} vertical={false} />
                                        <Tooltip
                                            formatter={(value, name) => [
                                                statsType === 'price'
                                                    ? `$${Number(value).toLocaleString()}`
                                                    : Number(value).toLocaleString(),
                                                name
                                            ]}
                                            labelFormatter={(value) => {
                                                const date = new Date(value);
                                                return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`;
                                            }}
                                        />
                                        <Legend 
                                            layout="vertical" 
                                            align="right" 
                                            verticalAlign="middle"
                                            iconType="circle"
                                            onMouseEnter={handleLegendMouseEnter}
                                            onMouseLeave={handleLegendMouseLeave}
                                            onClick={handleLegendClick}
                                            wrapperStyle={{
                                                paddingLeft: "8px",
                                                right: 0,
                                                backgroundColor: "white",
                                                padding: "6px 8px",
                                                border: "1px solid #f0f0f0",
                                                borderRadius: "4px",
                                                fontSize: "12px",
                                                cursor: "default"
                                            }}
                                        />
                                        {trendData?.units.map((unit, index) => (
                                            visibleSeries[unit] && <Line
                                                key={unit}
                                                dataKey={unit}
                                                name={unit}
                                                stroke={dark24[index % dark24.length]}
                                                dot={false}
                                                style={{
                                                    opacity: highlightedSeries ? (highlightedSeries === unit ? 1 : 0.3) : 1
                                                }}
                                            />
                                        ))}
                                    </LineChart>
                                )}
                            </ResponsiveContainer>
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

                    <div style={{ height: isMobile ? '500px' : '500px' }} className="bg-white rounded p-1 relative">
                        {statsDataForPie.data.length > 0 ? (
                            <ResponsiveContainer>
                                <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                                    <Pie
                                        data={statsDataForPie.data}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius="42%"
                                        outerRadius="75%"
                                        dataKey="value"
                                        nameKey="id"
                                        isAnimationActive={false}
                                        label={(props) => {
                                                const { value, id, percent, x, y, cx, index } = props;
                                                const offsetX = x > cx ? 8 : -8;
                                                const piePercent = (value / statsDataForPie.total) * 100;
                                                
                                                return (
                                                    <text 
                                                        x={x + offsetX} 
                                                        y={y} 
                                                        fill="#222"
                                                        fontSize={11}
                                                        textAnchor={x > cx ? "start" : "end"}
                                                        dominantBaseline="central"
                                                        dy={2}
                                                        letterSpacing={0.2}
                                                    >
                                                        {`${id} (${
                                                            statsType === 'price' 
                                                                ? value >= 1000000000 
                                                                    ? `${(value/1000000000).toFixed(1)}B`
                                                                    : value >= 1000000 
                                                                        ? `${(value/1000000).toFixed(0)}M`
                                                                        : `${(value/1000).toFixed(0)}k`
                                                                : value >= 1000 
                                                                    ? `${(value/1000).toFixed(0)}k`
                                                                    : value.toString()
                                                        }, ${piePercent.toFixed(1)}%)`}
                                                    </text>
                                            );
                                        }}
                                        labelLine={{
                                            strokeWidth: 0.8,
                                            stroke: '#666',
                                            strokeDasharray: "3 3",
                                            type: 'polyline',
                                            distance: 15
                                        }}
                                        labelOffset={12}
                                        paddingAngle={2}
                                        onClick={(data) => handlePieClick(data)}
                                    >
                                        {statsDataForPie.data.map((entry, index) => (
                                            <Cell 
                                                key={`cell-${index}`}
                                                fill={dark24[index % dark24.length]}
                                                stroke="#fff"
                                                strokeWidth={0.5}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        formatter={(value, name) => [
                                            statsType === 'price' 
                                                ? `$${Number(value).toLocaleString()}`
                                                : Number(value).toLocaleString(),
                                            name
                                        ]}
                                    />
                                    <Legend 
                                        layout={isMobile ? "horizontal" : "vertical"}
                                        align={isMobile ? "center" : "right"}
                                        verticalAlign={isMobile ? "bottom" : "middle"}
                                        iconType="circle"
                                        wrapperStyle={{
                                            ...(isMobile ? {
                                                position: 'absolute',
                                                bottom: 0,
                                                left: '50%',
                                                transform: 'translateX(-50%)',
                                                width: '100%',
                                                display: 'flex',
                                                flexWrap: 'wrap',
                                                justifyContent: 'center',
                                                gap: '8px',
                                                backgroundColor: "white",
                                                padding: "8px",
                                                fontSize: "12px",
                                                margin: 0,
                                                borderTop: "1px solid #f0f0f0",
                                                boxShadow: "0 -2px 4px rgba(0,0,0,0.05)"
                                            } : {
                                                position: 'absolute',
                                                right: 15,
                                                backgroundColor: "white",
                                                padding: "8px",
                                                border: "1px solid #f0f0f0",
                                                borderRadius: "4px",
                                                fontSize: "12px",
                                                lineHeight: "1.4",
                                                boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
                                            })
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
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
                            <DataTable columns={tenderTableColumns} data={unitTenders} pageSize={30} /> : 
                            <p>此單位在此月份無標案資料。</p>
                        )}
                    </div>
                )}
            </div>
        </>
    );
};

export default StatsPage;
