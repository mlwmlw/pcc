import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import { DataTable } from '../../components/DataTable';
import { LoadingOverlay } from '../../components/LoadingOverlay';
import { Select } from "@chakra-ui/react";

const dark24 = [
    '#1F77B4', '#FF7F0E', '#2CA02C', '#D62728', '#9467BD', '#8C564B', 
    '#E377C2', '#7F7F7F', '#BCBD22', '#17BECF', '#AEC7E8', '#FFBB78', 
    '#98DF8A', '#FF9896', '#C5B0D5', '#C49C94', '#F7B6D2', '#C7C7C7', 
    '#DBDB8D', '#9EDAE5', '#393B79', '#637939', '#8C6D31', '#843C39'
];

const ResponsiveBar = dynamic(() => import('@nivo/bar').then(mod => mod.ResponsiveBar), {
    ssr: false,
    loading: () => <p style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>圖表載入中...</p>,
});

export async function getServerSideProps(context) {
    const currentYear = new Date().getFullYear();
    const year = parseInt(context.query.year) || currentYear;
    const apiHost = "https://pcc.mlwmlw.org";

    let merchantsBySum = [];
    let merchantsByCount = [];
    let fetchError = null;

    try {
        const sumRes = await fetch(`${apiHost}/api/rank/merchants/sum/${year}`);
        if (!sumRes.ok) {
            let errorMsg = `Failed to fetch merchants by sum for ${year}: ${sumRes.status} ${sumRes.statusText}`;
            try {
                const errorBody = await sumRes.json();
                if (errorBody && errorBody.message) errorMsg += ` - ${errorBody.message}`;
            } catch (e) { /* ignore parsing error */ }
            throw new Error(errorMsg);
        }
        let rawMerchantsBySum = await sumRes.json();
        merchantsBySum = rawMerchantsBySum.map(m => ({
            _id: m._id,
            name: m.merchant?.name || m._id,
            address: m.merchant?.address || '',
            sum: m.sum,
            count: m.count,
        }));

        const countRes = await fetch(`${apiHost}/api/rank/merchants/count/${year}`);
        if (!countRes.ok) {
            let errorMsg = `Failed to fetch merchants by count for ${year}: ${countRes.status} ${countRes.statusText}`;
            try {
                const errorBody = await countRes.json();
                if (errorBody && errorBody.message) errorMsg += ` - ${errorBody.message}`;
            } catch (e) { /* ignore parsing error */ }
            throw new Error(errorMsg);
        }
        let rawMerchantsByCount = await countRes.json();
        merchantsByCount = rawMerchantsByCount.map(m => ({
            _id: m._id,
            name: m.merchant?.name || m._id,
            address: m.merchant?.address || '',
            sum: m.sum,
            count: m.count,
        }));

        return {
            props: {
                year,
                merchantsBySum,
                merchantsByCount,
                initialError: null,
            },
        };
    } catch (error) {
        fetchError = error.message;
        return {
            props: {
                year,
                merchantsBySum: [],
                merchantsByCount: [],
                initialError: fetchError || "無法獲取資料，請稍後再試。",
            },
        };
    }
}

const MerchantRankPage = ({ year, merchantsBySum, merchantsByCount, initialError }) => {
    const router = useRouter();
    const [selectedYear, setSelectedYear] = useState(year);
    const [isLoading, setIsLoading] = useState(false);
    
    useEffect(() => {
        if (year !== selectedYear) {
            setSelectedYear(year);
        }
        setIsLoading(false);
    }, [year, selectedYear]);

    const handleYearChange = async (event) => {
        const newYear = parseInt(event.target.value);
        setIsLoading(true);
        await router.push(`/rank/merchant?year=${newYear}`, undefined, { shallow: false });
    };
    
    if (initialError) {
        return <div className="container mx-auto p-4"><p className="text-red-500">資料載入錯誤: {initialError}</p></div>;
    }

    const barChartData = merchantsBySum.slice(0, 12).map(m => ({
        id: m.name || m._id, 
        name: m.name || m._id,
        value: m.sum,
    })).sort((a,b) => b.value - a.value);

    const columnsSum = [
        { header: '廠商名稱', accessorKey: 'name', cell: ({ row }) => <a href={`/merchants/${row.original._id}`} target="_blank" rel="noopener noreferrer">{row.original.name || row.original._id}</a> },
        { header: '公司所在地', accessorKey: 'address' },
        { header: '總金額', accessorKey: 'sum', cell: ({ row }) => row.original.sum != null ? `$${Number(row.original.sum).toLocaleString()}` : 'N/A' },
        { header: '得標數', accessorKey: 'count', cell: ({ row }) => row.original.count != null ? Number(row.original.count).toLocaleString() : 'N/A' },
    ];

    const columnsCount = [
        { header: '廠商名稱', accessorKey: 'name', cell: ({ row }) => <a href={`/merchants/${row.original._id}`} target="_blank" rel="noopener noreferrer">{row.original.name || row.original._id}</a> },
        { header: '公司所在地', accessorKey: 'address' },
        { header: '得標數', accessorKey: 'count', cell: ({ row }) => row.original.count != null ? Number(row.original.count).toLocaleString() : 'N/A' },
        { header: '總金額', accessorKey: 'sum', cell: ({ row }) => row.original.sum != null ? `$${Number(row.original.sum).toLocaleString()}` : 'N/A' },
    ];
    
    const currentRenderYear = new Date().getFullYear();
    const yearOptions = Array.from({ length: currentRenderYear - 2011 }, (_, i) => currentRenderYear - i);

    return (
        <>
            <Head>
                <title>廠商標案排行</title>
                <meta name="description" content={`查詢 ${selectedYear} 年度廠商標案總金額與數量排行`} />
            </Head>
            <div className="container mx-auto p-4 relative">
                <h1 className="text-2xl font-bold mb-4">廠商標案排行</h1>

                <div className="mb-4">
                    篩選年份：
                    <Select
                        width="120px"
                        value={selectedYear}
                        onChange={handleYearChange}
                        isDisabled={isLoading}
                        variant="filled"
                    >
                        {yearOptions.map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </Select>
                </div>
                {isLoading && <LoadingOverlay />}

                <h2 className="text-xl font-semibold mt-6 mb-2">標案總金額排行 (Top 12)</h2>
                <div style={{ height: '400px' }} className="bg-white shadow rounded p-4">
                    {barChartData.length > 0 ? (
                        <ResponsiveBar
                            data={barChartData}
                            keys={['value']}
                            indexBy="name"
                            margin={{ top: 20, right: 30, bottom: 180, left: 100 }}
                            padding={0.3}
                            valueScale={{ type: 'linear' }}
                            indexScale={{ type: 'band', round: true }}
                            colors={(bar) => dark24[bar.index % dark24.length]}
                            axisTop={null}
                            axisRight={null}
                            axisBottom={{
                                tickSize: 5,
                                tickPadding: 5,
                                tickRotation: -45,
                                legend: '廠商名稱',
                                legendPosition: 'middle',
                                legendOffset: 100,
                            }}
                            axisLeft={{
                                tickSize: 5,
                                tickPadding: 5,
                                tickRotation: 0,
                                legend: '總金額',
                                legendPosition: 'middle',
                                legendOffset: -90,
                                format: v => v >= 1000000000 
                                            ? `${(v/1000000000).toFixed(0)}B`
                                                : v >= 1000000 
                                                ? `${(v/1000000).toFixed(0)}M`
                                                : `${(v/1000).toFixed(0)}k`
                            }}
                            labelSkipWidth={12}
                            labelSkipHeight={12}
                            labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                            animate={true}
                            motionStiffness={90}
                            motionDamping={15}
                            tooltip={({ id, value, indexValue }) => (
                                <strong style={{ color: '#333' }}>
                                    {indexValue}: ${Number(value).toLocaleString()}
                                </strong>
                            )}
                        />
                    ) : <p>此年份無足夠資料可繪製圖表。</p>}
                </div>

                <h2 className="text-xl font-semibold mt-8 mb-2">標案總金額排行 (列表)</h2>
                {merchantsBySum.length > 0 ? (
                    <DataTable
                        columns={columnsSum}
                        data={merchantsBySum}
                        pageSize={30}
                    />
                ) : <p>此年份無資料。</p>}

                <h2 className="text-xl font-semibold mt-8 mb-2">標案數量排行 (列表)</h2>
                {merchantsByCount.length > 0 ? (
                    <DataTable
                        columns={columnsCount}
                        data={merchantsByCount}
                        pageSize={30}
                    />
                ) : <p>此年份無資料。</p>}
            </div>
        </>
    );
};

export default MerchantRankPage;
