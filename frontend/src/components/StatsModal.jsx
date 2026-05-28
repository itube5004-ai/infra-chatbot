import React, { useState, useEffect } from 'react';

export default function StatsModal({ onClose }) {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/stats`)
      .then(res => res.json())
      .then(data => {
        if (data.stats) {
          setStats(data.stats);
        }
      })
      .catch(err => console.error("Failed to fetch stats:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="modal-overlay" style={{ zIndex: 100 }}>
      <div className="modal-content" style={{ maxWidth: '600px', width: '90%' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          📊 임직원 질문 통계
        </h3>
        <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '20px' }}>
          임직원들이 챗봇에 가장 많이 물어본 질문 순위입니다. (서버 재시작 시 초기화될 수 있습니다.)
        </p>

        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
            데이터를 불러오는 중...
          </div>
        ) : stats.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
            아직 누적된 질문 데이터가 없습니다.
          </div>
        ) : (
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                  <th style={{ padding: '10px' }}>순위</th>
                  <th style={{ padding: '10px' }}>질문 내용</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>질문 횟수</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((stat, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '10px', color: '#a5b4fc', fontWeight: 'bold' }}>{index + 1}</td>
                    <td style={{ padding: '10px' }}>{stat.query}</td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <span style={{ background: '#312e81', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem' }}>
                        {stat.count}회
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button className="send-button" style={{ width: 'auto', padding: '0 20px' }} onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
