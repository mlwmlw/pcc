import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { DataTable } from '../../components/DataTable';

export async function getServerSideProps(context) {
    const currentYear = new Date().getFullYear();
    const year = parseInt(context.query.year) || currentYear;
    const apiHost = "https://pcc.mlwmlw.org";

    let partners = [];
    let fetchError = null;

    try {
        const res = await fetch(`${apiHost}/api/partner/${year}`);
        if (!res.ok) {
            let errorMsg = `Failed to fetch partner rank for ${year}: ${res.status} ${res.statusText}`;
            try {
                const errorBody = await res.json();
                if (errorBody && errorBody.message) errorMsg += ` - ${errorBody.message}`;
            } catch (e) { /* ignore parsing error */ }
            throw new Error(errorMsg);
        }
        let rawPartners = await res.json();
        
        partners = rawPartners.map(p => ({
            ...p,
            merchant: {
                ...p.merchant,
                _id: p.merchant?._id ? p.merchant._id.toString() : null,
            }
        }));

        return {
            props: {
                year,
                partners,
                initialError: null,
            },
        };
    } catch (error) {
        fetchError = error.message;
        return {
            props: {
                year,
                partners: [],
                initialError: fetchError || "無法獲取資料，請稍後再試。",
            },
        };
    }
}

const PartnerRankPage = ({ year, partners, initialError }) => {
    const router = useRouter();
    const [selectedYear, setSelectedYear] = useState(year);

    useEffect(() => {
        if (year !== selectedYear) {
            setSelectedYear(year);
        }
    }, [year, selectedYear]);

    const handleYearChange = (event) => {
        const newYear = parseInt(event.target.value);
        router.push(`/rank/partner?year=${newYear}`, undefined, { shallow: false });
    };
    
    if (initialError) {
        return <div className="container mx-auto p-4"><p className="text-red-500">資料載入錯誤: {initialError}</p></div>;
    }

    const columns = [
        { header: '單位', accessorKey: 'unit', cell: ({ row }) => <a href={`/unit/${row.original.unit}`} target="_blank" rel="noopener noreferrer">{row.original.unit}</a> },
        { header: '廠商', accessorKey: 'merchant.name', cell: ({ row }) => <a href={`/merchants/${row.original.merchant._id}`} target="_blank" rel="noopener noreferrer">{row.original.merchant.name}</a> },
        { header: '合作次數', accessorKey: 'count', cell: ({ row }) => row.original.count != null ? Number(row.original.count).toLocaleString() : 'N/A'},
        { header: '合作總金額', accessorKey: 'price', cell: ({ row }) => row.original.price != null ? `$${Number(row.original.price).toLocaleString()}` : 'N/A' },
    ];
    
    const currentRenderYear = new Date().getFullYear();
    const yearOptions = Array.from({ length: currentRenderYear - 2011 }, (_, i) => currentRenderYear - i);

    return (
        <>
            <Head>
                <title>機關合作夥伴排行 - {selectedYear}</title>
                <meta name="description" content={`查詢 ${selectedYear} 年度機關合作夥伴排行`} />
            </Head>
            <div className="container mx-auto p-4">
                <h1 className="text-2xl font-bold mb-4">機關合作夥伴排行 - {selectedYear}</h1>

                <div className="mb-4">
                    <label htmlFor="year-select" className="mr-2">選擇年份:</label>
                    <select id="year-select" value={selectedYear} onChange={handleYearChange} className="p-2 border rounded">
                        {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
                
                {partners.length > 0 ? (
                    <DataTable
                        columns={columns}
                        data={partners}
                        pageSize={30}
                    />
                ) : <p>此年份無資料。</p>}
            </div>
        </>
    );
};

export default PartnerRankPage;
