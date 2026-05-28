import React, { useState, useEffect } from 'react';

export default function FaqArea({ categories }) {
  const [selectedCat, setSelectedCat] = useState("");
  const [faqs, setFaqs] = useState([]);
  const [selectedQues, setSelectedQues] = useState("");
  const [answer, setAnswer] = useState(null);

  useEffect(() => {
    if (categories.length > 0 && !selectedCat) {
      setSelectedCat(categories[0]);
    }
  }, [categories, selectedCat]);

  useEffect(() => {
    if (selectedCat) {
      fetch(`${import.meta.env.VITE_API_URL}/faq/${encodeURIComponent(selectedCat)}`)
        .then(res => res.json())
        .then(data => {
          setFaqs(data.faqs || []);
          if (data.faqs && data.faqs.length > 0) {
            setSelectedQues(data.faqs[0].question);
          } else {
            setSelectedQues("");
          }
        });
    }
  }, [selectedCat]);

  useEffect(() => {
    if (selectedQues && faqs.length > 0) {
      const found = faqs.find(f => f.question === selectedQues);
      setAnswer(found);
    } else {
      setAnswer(null);
    }
  }, [selectedQues, faqs]);

  if (categories.length === 0) {
    return (
      <div style={{color: 'var(--text-secondary)'}}>
        ⚠️ 엑셀 데이터를 먼저 로드해주세요.
      </div>
    );
  }

  return (
    <div className="faq-container">
      <div style={{color: 'var(--text-secondary)', marginBottom: '10px'}}>
        카테고리와 질문을 고르면 공식 답변을 바로 확인할 수 있습니다.
      </div>
      
      <div className="faq-controls">
        <div className="faq-select-wrapper">
          <div className="section-label">① 카테고리 선택</div>
          <select 
            className="premium-select"
            value={selectedCat}
            onChange={e => setSelectedCat(e.target.value)}
          >
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        
        <div className="faq-select-wrapper" style={{flex: 2}}>
          <div className="section-label">② 질문 선택</div>
          <select 
            className="premium-select"
            value={selectedQues}
            onChange={e => setSelectedQues(e.target.value)}
          >
            {faqs.map(f => <option key={f.question} value={f.question}>{f.question}</option>)}
          </select>
        </div>
      </div>

      {answer && (
        <div className="answer-card">
          <div className="answer-title">💡 공식 답변</div>
          <div className="answer-text">
            {answer.answer.split('\n').map((line, i) => <p key={i} style={{marginBottom: '8px', color: 'var(--text-primary)'}}>{line}</p>)}
          </div>
          <div className="contact-badge">
            📞 담당 부서 &nbsp;|&nbsp; {answer.contact}
          </div>
        </div>
      )}
    </div>
  );
}
