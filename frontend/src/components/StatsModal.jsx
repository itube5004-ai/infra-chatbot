import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { API_URL } from '../api';

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1'];

export default function StatsModal({ onClose }) {
  const [queries, setQueries] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all'); // 'all', '1w', '1m', '2m', '3m', 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Dropdown states for Year, Month, Day
  const [startYear, setStartYear] = useState('');
  const [startMonth, setStartMonth] = useState('');
  const [startDay, setStartDay] = useState('');
  const [endYear, setEndYear] = useState('');
  const [endMonth, setEndMonth] = useState('');
  const [endDay, setEndDay] = useState('');

  const formatDate = (date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Sync dropdown values to startDate
  useEffect(() => {
    if (startYear && startMonth && startDay) {
      setStartDate(`${startYear}-${startMonth.padStart(2, '0')}-${startDay.padStart(2, '0')}`);
    } else {
      setStartDate('');
    }
  }, [startYear, startMonth, startDay]);

  // Sync dropdown values to endDate
  useEffect(() => {
    if (endYear && endMonth && endDay) {
      setEndDate(`${endYear}-${endMonth.padStart(2, '0')}-${endDay.padStart(2, '0')}`);
    } else {
      setEndDate('');
    }
  }, [endYear, endMonth, endDay]);

  useEffect(() => {
    let url = `${API_URL}/stats`;
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    setLoading(true);
    fetch(url)
      .then(res => res.json())
      .then(data => {
        setQueries(data.queries || []);
        setCategories(data.categories || []);
      })
      .catch(err => console.error("Failed to fetch stats:", err))
      .finally(() => setLoading(false));
  }, [startDate, endDate]);

  const applyPreset = (preset) => {
    setFilterType(preset);
    const today = new Date();
    let start = new Date();
    
    if (preset === 'all') {
      setStartYear('');
      setStartMonth('');
      setStartDay('');
      setEndYear('');
      setEndMonth('');
      setEndDay('');
      setStartDate('');
      setEndDate('');
      return;
    } else if (preset === '1w') {
      start.setDate(today.getDate() - 7);
    } else if (preset === '1m') {
      start.setMonth(today.getMonth() - 1);
    } else if (preset === '2m') {
      start.setMonth(today.getMonth() - 2);
    } else if (preset === '3m') {
      start.setMonth(today.getMonth() - 3);
    }
    
    // Set dropdown states
    setStartYear(String(start.getFullYear()));
    setStartMonth(String(start.getMonth() + 1));
    setStartDay(String(start.getDate()));
    
    setEndYear(String(today.getFullYear()));
    setEndMonth(String(today.getMonth() + 1));
    setEndDay(String(today.getDate()));
  };

  const downloadCSV = () => {
    if (queries.length === 0) return;
    
    // Create CSV content
    const headers = ['순위', '카테고리', '질문 내용', '질문 횟수'];
    const csvRows = [headers.join(',')];
    
    queries.forEach((q, idx) => {
      // Escape quotes and commas
      const queryText = `"${q.query.replace(/"/g, '""')}"`;
      const categoryText = `"${q.category.replace(/"/g, '""')}"`;
      csvRows.push(`${idx + 1},${categoryText},${queryText},${q.count}`);
    });
    
    const csvContent = csvRows.join('\r\n'); // Use Excel standard CRLF line endings
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]); // Standard UTF-8 BOM to prevent broken characters in Excel
    const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'infra_helpdesk_statistics.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const selectStyle = {
    background: '#0f172a',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    padding: '6px 28px 6px 12px',
    color: 'white',
    fontSize: '0.85rem',
    outline: 'none',
    cursor: 'pointer',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml;utf8,<svg fill='white' height='24' viewBox='0 0 24 24' width='24' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/><path d='M0 0h24v24H0z' fill='none'/></svg>")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 8px center',
    backgroundSize: '16px'
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

        {/* Filter Bar */}
        <div style={{ 
          background: 'rgba(255, 255, 255, 0.03)', 
          border: '1px solid rgba(255, 255, 255, 0.08)', 
          borderRadius: '12px', 
          padding: '16px', 
          marginBottom: '20px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px'
        }}>
          {/* Preset Buttons */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {['all', '1w', '1m', '2m', '3m'].map((p) => {
              const label = p === 'all' ? '전체' : p === '1w' ? '최근 1주일' : p === '1m' ? '최근 1개월' : p === '2m' ? '최근 2개월' : '최근 3개월';
              const active = filterType === p;
              return (
                <button
                  key={p}
                  onClick={() => applyPreset(p)}
                  style={{
                    background: active ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(255, 255, 255, 0.05)',
                    color: active ? 'white' : '#94a3b8',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: active ? '0 2px 8px rgba(99, 102, 241, 0.3)' : 'none'
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Custom Date Dropdowns */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500 }}>직접 선택:</span>
            
            {/* Start Date */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <select 
                value={startYear} 
                onChange={(e) => { setFilterType('custom'); setStartYear(e.target.value); }}
                style={selectStyle}
              >
                <option value="">년</option>
                {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}년</option>)}
              </select>
              <select 
                value={startMonth} 
                onChange={(e) => { setFilterType('custom'); setStartMonth(e.target.value); }}
                style={selectStyle}
              >
                <option value="">월</option>
                {Array.from({length: 12}, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}월</option>)}
              </select>
              <select 
                value={startDay} 
                onChange={(e) => { setFilterType('custom'); setStartDay(e.target.value); }}
                style={selectStyle}
              >
                <option value="">일</option>
                {Array.from({length: 31}, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}일</option>)}
              </select>
            </div>

            <span style={{ color: '#64748b' }}>~</span>

            {/* End Date */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <select 
                value={endYear} 
                onChange={(e) => { setFilterType('custom'); setEndYear(e.target.value); }}
                style={selectStyle}
              >
                <option value="">년</option>
                {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}년</option>)}
              </select>
              <select 
                value={endMonth} 
                onChange={(e) => { setFilterType('custom'); setEndMonth(e.target.value); }}
                style={selectStyle}
              >
                <option value="">월</option>
                {Array.from({length: 12}, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}월</option>)}
              </select>
              <select 
                value={endDay} 
                onChange={(e) => { setFilterType('custom'); setEndDay(e.target.value); }}
                style={selectStyle}
              >
                <option value="">일</option>
                {Array.from({length: 31}, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}일</option>)}
              </select>
            </div>
          </div>
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
