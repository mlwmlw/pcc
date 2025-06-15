import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

const Custom404 = () => {
  return (
    <div className="min-w-6xl max-w-screen-lg px-4 mx-auto">
      <Head>
        <title>404 - 頁面不存在 - 開放政府標案</title>
      </Head>
      <div className="container starter-template text-center py-12">
        <h1 className="text-4xl font-bold mb-6">404 - 頁面不存在</h1>
        <p className="mb-8">您請求的頁面不存在或已移動到其他位置。</p>
        <Link href="/" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          返回首頁
        </Link>
      </div>
    </div>
  );
};

export default Custom404;
