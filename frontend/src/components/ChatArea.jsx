import React, { useState, useRef, useEffect } from 'react';
import { API_URL } from '../api';

export default function ChatArea() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endOfMessagesRef = useRef(null);

  const scrollToBottom = () => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInput("");
    setLoading(true);

    try {
      const apiKey = localStorage.getItem("infra_api_key") || "";
      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userMsg, api_key: apiKey })
      });
      
      const data = await res.json();
      if (res.ok) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.answer }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: "⚠️ 오류: " + data.detail }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: "⚠️ 서버 연결 오류: " + err.message }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.length === 0 && (
          <div style={{color: 'var(--text-secondary)', textAlign: 'center', marginTop: '40px', lineHeight: 1.8}}>
            🤖 사내 인프라에 관해 무엇이든 물어보세요.<br/>
            (예: "정문동 완공은 언제 되나요?")
          </div>
        )}
        
        {messages.map((msg, idx) => (
          <div key={idx} className={`chat-bubble ${msg.role}`}>
            {msg.content.split('\n').map((line, i) => (
              <span key={i}>{line}<br/></span>
            ))}
          </div>
        ))}
        
        {loading && (
          <div className="chat-bubble assistant" style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
            <div className="spinner"></div> <span style={{color: 'var(--text-secondary)'}}>문서를 검색하고 답변을 생성 중입니다...</span>
          </div>
        )}
        <div ref={endOfMessagesRef} />
      </div>
      
      <div className="chat-input-wrapper">
        <div className="chat-input-box">
          <input 
            type="text" 
            placeholder="예: VPN 연결이 안 돼요. 어떻게 해야 하나요?"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if(e.key === 'Enter') handleSend();
            }}
            disabled={loading}
          />
          <button className="send-button" onClick={handleSend} disabled={loading}>
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}
