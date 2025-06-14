import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { DataTable } from '../../components/DataTable';

export async function getServerSideProps(context) {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    const year = parseInt(context.query.year) || currentYear;
    const month = parseInt(context.query.month) || currentMonth;
    const monthPadded = month.toString().padStart(2, '0');
    const apiHost = "https://pcc.mlwmlw.org";

    let tenders = [];
    let fetchError = null;

    try {
        const res = await fetch(`${apiHost}/api/rank/tender/${year}-${monthPadded}`);
        if (!res.ok) {
            let errorMsg = `Failed to fetch tender rank for ${year}-${monthPadded}: ${res.status} ${res.statusText}`;
            try {
                const errorBody = await res.json();
                if (errorBody && errorBody.message) errorMsg += ` - ${errorBody.message}`;
            } catch (e) { /* ignore parsing error */ }
            throw new Error(errorMsg);
        }
        let rawTenders = await res.json();
        
        tenders = rawTenders.map(tender => ({
            ...tender,
            _id: tender._id ? tender._id.toString() : null,
            publish: tender.publish ? new Date(tender.publish).toISOString().split('T')[0] : null,
        }));

        return {
            props: {
                year,
                month,
                tenders,
                initialError: null,
            },
        };
    } catch (error) {
        fetchError = error.message;
        return {
            props: {
                year,
                month,
                tenders: [],
                initialError: fetchError || "無法獲取資料，請稍後再試。",
            },
        };
    }
}

const TenderRankPage = ({ year, month, tenders, initialError }) => {
    const router = useRouter();
    const [selectedYear, setSelectedYear] = useState(year);
    const [selectedMonth, setSelectedMonth] = useState(month);

    useEffect(() => {
        setSelectedYear(year);
        setSelectedMonth(month);
    }, [year, month]);

    const handleDateChange = () => {
        router.push(`/rank/tender?year=${selectedYear}&month=${selectedMonth}`, undefined, { shallow: false });
    };

    if (initialError) {
        return <div className="container mx-auto p-4"><p className="text-red-500">資料載入錯誤: {initialError}</p></div>;
    }

    const columns = [
        { header: '標案名稱', accessorKey: 'name', cell: ({ row }) => <a href={`/tender/${row.original.unit_id || row.original.unit}/${row.original.job_number}`} target="_blank" rel="noopener noreferrer">{row.original.name}</a> },
        { header: '機關名稱', accessorKey: 'unit', cell: ({row}) => <a href={`/unit/${row.original.unit_id}`} target="_blank" rel="noopener noreferrer">{row.original.unit}</a> },
        { header: '招標日期', accessorKey: 'publish' },
        { header: '標案金額', accessorKey: 'price', cell: ({ row }) => row.original.price != null ? `$${Number(row.original.price).toLocaleString()}` : '未提供' },
        { 
            header: '得標廠商', 
            accessorKey: 'award.merchants', 
            cell: ({ row }) => {
                const merchants = row.original.award?.merchants;
                if (!merchants || merchants.length === 0) return '無';
                return (
                    <ul className="list-disc list-inside">
                        {merchants.map(m => (
                            <li key={m._id || m.name}>
                                <a href={`/merchants/${m._id || m.name}`} target="_blank" rel="noopener noreferrer">
                                    {m.name}
                                </a>
                                {m.amount && ` ($${Number(m.amount).toLocaleString()})`}
                            </li>
                        ))}
                    </ul>
                );
            }
        },
    ];

    const currentRenderYear = new Date().getFullYear();
    const yearOptions = Array.from({ length: currentRenderYear - 2011 }, (_, i) => currentRenderYear - i);
    const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1);

    return (
        <>
            <Head>
                <title>標案金額排行 - {selectedYear}-{selectedMonth.toString().padStart(2, '0')}</title>
                <meta name="description" content={`查詢 ${selectedYear} 年 ${selectedMonth} 月標案金額排行`} />
            </Head>
            <div className="container mx-auto p-4">
                <h1 className="text-2xl font-bold mb-4">標案金額排行 - {selectedYear}-{selectedMonth.toString().padStart(2, '0')}</h1>

                <div className="mb-4 flex items-center space-x-2">
                    <div>
                        <label htmlFor="year-select" className="mr-2">年份:</label>
                        <select 
                            id="year-select" 
                            value={selectedYear} 
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))} 
                            className="p-2 border rounded"
                        >
                            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="month-select" className="mr-2">月份:</label>
                        <select 
                            id="month-select" 
                            value={selectedMonth} 
                            onChange={(e) => setSelectedMonth(parseInt(e.target.value))} 
                            className="p-2 border rounded"
                        >
                            {monthOptions.map(m => <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>)}
                        </select>
                    </div>
                    <button onClick={handleDateChange} className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                        查詢
                    </button>
                </div>
                
                {tenders.length > 0 ? (
                    <DataTable
                        columns={columns}
                        data={tenders}
                        pageSize={30}
                    />
                ) : <p>此月份無資料。</p>}
            </div>
        </>
    );
};

export default TenderRankPage;
