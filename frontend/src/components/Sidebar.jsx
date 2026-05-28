import React, { useRef, useState } from 'react';

export default function Sidebar({ setCategories }) {
  const fileInputRef = useRef(null);
  const [apiKey, setApiKey] = useState("");
  const [uploading, setUploading] = useState(false);
  
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/upload`, {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if(data.status === 'success') {
        // Fetch categories to update UI
        const catRes = await fetch(`${import.meta.env.VITE_API_URL}/categories`);
        const catData = await catRes.json();
        setCategories(catData.categories || []);
      } else {
        alert("업로드 실패: " + data.detail);
      }
    } catch (err) {
      alert("서버 연결 오류: " + err.message);
    } finally {
      setUploading(false);
      if(fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="sidebar">
      <h2>🏢 인프라 헬프데스크</h2>
      
      <div className="sidebar-section">
        <div className="section-label">🔑 API 설정</div>
        <input 
          type="password" 
          className="premium-input" 
          placeholder="API 키 입력 (선택)"
          value={apiKey}
          onChange={(e) => {
            setApiKey(e.target.value);
            // In a real app we might pass this key to Context or Parent State to send with /chat requests
            // For simplicity, we just save to localStorage
            localStorage.setItem("infra_api_key", e.target.value);
          }}
        />
      </div>

      <div className="sidebar-section">
        <div className="section-label">📂 데이터 업로드</div>
        <div className="file-upload-area" onClick={() => fileInputRef.current.click()}>
          {uploading ? (
             <span style={{color: '#94a3b8'}}>업로드 중...</span>
          ) : (
             <span style={{color: '#a5b4fc', fontWeight: 600}}>📄 클릭하여 엑셀 업로드</span>
          )}
          <input 
            type="file" 
            accept=".xlsx" 
            ref={fileInputRef} 
            onChange={handleUpload}
          />
        </div>
      </div>
      
      <div style={{fontSize: '0.8rem', color: '#64748b', lineHeight: 1.6, marginTop: '20px'}}>
        📌 <b style={{color: 'var(--accent-light)'}}>사용 방법</b><br/><br/>
        1. API 키 입력 (없으면 기본값 사용)<br/>
        2. 엑셀 파일 업로드<br/>
        3. 카테고리별 FAQ 탭에서 빠른 검색<br/>
        4. AI 챗봇 탭에서 자유롭게 질문
      </div>
    </div>
  );
}
