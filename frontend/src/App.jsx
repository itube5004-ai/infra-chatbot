import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import FaqArea from './components/FaqArea';
import StatsModal from './components/StatsModal';
import { API_URL } from './api';

export default function App() {
  const [activeTab, setActiveTab] = useState('faq'); // 'faq' or 'chat'
  const [categories, setCategories] = useState([]);
  const [showStats, setShowStats] = useState(false);
  
  // Admin State
  const [isAdmin, setIsAdmin] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [password, setPassword] = useState("");
  
  // Change Password State
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    // Initial fetch for categories
    fetch(`${API_URL}/categories`)
      .then(res => res.json())
      .then(data => {
        if(data.categories) setCategories(data.categories);
      })
      .catch(err => console.log("Init fetch err:", err));
  }, []);

  const handleAdminLogin = () => {
    const currentAdminPassword = localStorage.getItem('adminPassword') || "admin1234";
    if (password === currentAdminPassword) {
      setIsAdmin(true);
      setShowModal(false);
      setPassword("");
    } else {
      alert("비밀번호가 일치하지 않습니다.");
    }
  };

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      alert("새 비밀번호가 일치하지 않습니다.");
      return;
    }
    if (newPassword.length < 4) {
      alert("비밀번호는 최소 4자리 이상이어야 합니다.");
      return;
    }
    localStorage.setItem('adminPassword', newPassword);
    alert("비밀번호가 성공적으로 변경되었습니다.");
    setShowChangePasswordModal(false);
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="app-container">
      {/* 관리자 모드일 때만 사이드바(왼쪽) 렌더링 */}
      {isAdmin && <Sidebar setCategories={setCategories} onShowStats={() => setShowStats(true)} />}
      
      <div className="main-content" style={{ position: 'relative' }}>
        
        {/* 우측 상단 버튼들 */}
        <div style={{ position: 'absolute', top: '24px', right: '40px', zIndex: 10, display: 'flex', gap: '10px' }}>
          {isAdmin && (
            <button 
              className="tab-button" 
              style={{ background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', color: '#a5b4fc' }}
              onClick={() => setShowStats(true)}
            >
              📊 질문 통계 보기
            </button>
          )}
          {!isAdmin ? (
            <button className="tab-button" onClick={() => setShowModal(true)}>
              ⚙️ 관리자 모드
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="tab-button" onClick={() => setShowChangePasswordModal(true)}>
                🔑 비밀번호 변경
              </button>
              <button className="tab-button" onClick={() => setIsAdmin(false)}>
                🔓 로그아웃
              </button>
            </div>
          )}
        </div>

        {/* 비밀번호 입력 모달 */}
        {showModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>🔒 관리자 권한 확인</h3>
              <p>API 설정 및 데이터 업로드를 위해 비밀번호를 입력하세요.</p>
              <input 
                type="password" 
                className="premium-input" 
                placeholder="비밀번호"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleAdminLogin();
                }}
                autoFocus
              />
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
                <button className="tab-button" onClick={() => setShowModal(false)}>취소</button>
                <button className="send-button" style={{ width: 'auto', padding: '0 20px' }} onClick={handleAdminLogin}>확인</button>
              </div>
            </div>
          </div>
        )}

        {/* 비밀번호 변경 모달 */}
        {showChangePasswordModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>🔑 비밀번호 변경</h3>
              <p>새로운 관리자 비밀번호를 입력하세요.</p>
              <input 
                type="password" 
                className="premium-input" 
                placeholder="새 비밀번호"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                style={{ marginBottom: '10px' }}
                autoFocus
              />
              <input 
                type="password" 
                className="premium-input" 
                placeholder="비밀번호 확인"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleChangePassword();
                }}
              />
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
                <button className="tab-button" onClick={() => setShowChangePasswordModal(false)}>취소</button>
                <button className="send-button" style={{ width: 'auto', padding: '0 20px' }} onClick={handleChangePassword}>변경</button>
              </div>
            </div>
          </div>
        )}

        <div className="hero-header">
          <div className="hero-badge">🤖 AI-Powered · RAG 기반 검색</div>
          <h1>사내 인프라 스마트 헬프데스크</h1>
          <p>
            인프라 관련 FAQ를 빠르게 찾거나, AI 비서에게 자유롭게 질문해 보세요.<br/>
            업로드된 문서에 등록된 정보만을 기반으로 정확하게 답변해 드립니다.
          </p>
        </div>

        <div className="tabs-container">
          <div className="tabs-header">
            <button 
              className={`tab-button ${activeTab === 'faq' ? 'active' : ''}`}
              onClick={() => setActiveTab('faq')}
            >
              📂 카테고리별 FAQ 바로 찾기
            </button>
            <button 
              className={`tab-button ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')}
            >
              💬 AI 인프라 비서 (챗봇)
            </button>
          </div>

          {activeTab === 'faq' ? (
            <FaqArea categories={categories} />
          ) : (
            <ChatArea />
          )}
        </div>
      </div>
      
      {showStats && <StatsModal onClose={() => setShowStats(false)} />}
    </div>
  );
}
