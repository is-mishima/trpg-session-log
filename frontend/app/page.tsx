'use client';
import { useEffect, useState } from 'react';

export default function Home() {
  const [data, setData] = useState('Loading...');

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_BASE!;
    fetch(`${base}/health`)
      .then(res => res.json())
      .then(json => setData(JSON.stringify(json)))
      .catch(() => setData('Error'));
  }, []);

  return (
    <main style={{ padding: 20 }}>
      <h1>TRPG セッション管理アプリ</h1>
      <p>APIからの応答: {data}</p>
    </main>
  );
}
