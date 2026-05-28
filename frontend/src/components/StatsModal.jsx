import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { API_URL } from '../api';

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1'];

export default function StatsModal({ onClose }) {
  const [queries, setQueries] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/stats`)
      .then(res => res.json())
      .then(data => {
        if (data.queries) setQueries(data.queries);
        if (data.categories) setCategories(data.categories);
      })
      .catch(err => console.error("Failed to fetch stats:", err))
      .finally(() => setLoading(false));
  }, []);

  const downloadCSV = () => {
    if (queries.length === 0) return;
    
    // Create CSV content
    const headers = ['순위', '카테고리', '질문 내용', '조회수'];
    const csvRows = [headers.join(',')];
    
    queries.forEach((q, idx) => {
      // Escape quotes and commas
      const queryText = `"${q.query.replace(/"/g, '""')}"`;
      const categoryText = `"${q.category.replace(/"/g, '""')}"`;
      csvRows.push(`${idx + 1},${categoryText},${queryText},${q.count}`);
    });
    
    const csvContent = "\\uFEFF" + csvRows.join('\\n'); // Add BOM for Excel UTF-8
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'infra_helpdesk_statistics.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 100 }}>
      <div className="modal-content" style={{ maxWidth: '1050px', width: '95%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              📊 임직원 질문 통계 분석
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '5px 0 0 0' }}>
              카테고리별 비중 및 질문 상세 내역입니다.
            </p>
          </div>
          <button 
            onClick={downloadCSV}
            style={{
              background: '#10b981', color: 'white', border: 'none', 
              padding: '8px 16px', borderRadius: '8px', cursor: 'pointer',
              fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px'
            }}
          >
            📥 엑셀(CSV) 다운로드
          </button>
        </div>
 
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
            데이터를 불러오는 중...
          </div>
        ) : queries.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
            아직 누적된 질문 데이터가 없습니다. 질문을 입력해 보세요!
          </div>
        ) : (
          <div className="stats-grid-container">
            
            {/* Chart Area */}
            <div style={{ background: '#0f172a', padding: '20px', borderRadius: '12px' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#e2e8f0', textAlign: 'center' }}>카테고리별 질문 비중</h4>
              <div style={{ width: '100%', height: '250px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categories}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {categories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
 
            {/* Table Area */}
            <div style={{ maxHeight: '352px', overflowY: 'auto', background: '#0f172a', borderRadius: '12px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ position: 'sticky', top: 0, background: '#1e293b' }}>
                  <tr style={{ color: '#94a3b8' }}>
                    <th style={{ padding: '12px' }}>순위</th>
                    <th style={{ padding: '12px' }}>카테고리</th>
                    <th style={{ padding: '12px' }}>질문 내용</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>질문 횟수</th>
                  </tr>
                </thead>
                <tbody>
                  {queries.map((q, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '12px', color: '#a5b4fc', fontWeight: 'bold' }}>{index + 1}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ background: '#475569', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem', color: '#f1f5f9' }}>
                          {q.category}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: '#e2e8f0' }}>{q.query}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span style={{ background: '#312e81', padding: '4px 12px', borderRadius: '12px', fontSize: '0.85rem', color: '#c7d2fe', fontWeight: 'bold' }}>
                          {q.count}회
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button className="send-button" style={{ width: 'auto', padding: '0 30px' }} onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
