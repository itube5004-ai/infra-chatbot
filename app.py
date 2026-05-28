import streamlit as st
import pandas as pd
from langchain_community.document_loaders import DataFrameLoader
from langchain_community.vectorstores import FAISS
from langchain_community.retrievers import BM25Retriever
from langchain_classic.retrievers import EnsembleRetriever
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_classic.chains import create_retrieval_chain
from langchain_classic.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate
from langchain_text_splitters import RecursiveCharacterTextSplitter
import os
import io

# ─────────────────────────────────────────────
# 페이지 설정
# ─────────────────────────────────────────────
st.set_page_config(
    page_title="사내 인프라 헬프데스크",
    page_icon="🏢",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ─────────────────────────────────────────────
# 커스텀 CSS (Premium Dark-Accent Design)
# ─────────────────────────────────────────────
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600&display=swap');

    html, body, [class*="css"] {
        font-family: 'Inter', 'Outfit', sans-serif;
    }

    /* 전체 배경 */
    .stApp {
        background: linear-gradient(135deg, #0f0c29, #1a1a3e, #24243e);
        min-height: 100vh;
    }

    /* 상단 헤더 (Deploy, 햄버거 메뉴 등) 투명화 및 글자색 지정 */
    header[data-testid="stHeader"] {
        background-color: transparent !important;
        background-image: none !important;
    }
    header[data-testid="stHeader"] * {
        color: #a5b4fc !important;
    }
    /* Deploy 버튼 숨기기 (깔끔한 UI 유지) */
    .stDeployButton {
        display: none !important;
    }

    /* 사이드바 */
    [data-testid="stSidebar"] {
        background: linear-gradient(180deg, #1a1a3e 0%, #0f0c29 100%) !important;
        border-right: 1px solid rgba(100, 149, 237, 0.2);
    }
    [data-testid="stSidebar"] * {
        color: #e2e8f0 !important;
    }
    [data-testid="stSidebar"] .stSelectbox label,
    [data-testid="stSidebar"] .stFileUploader label,
    [data-testid="stSidebar"] h1,
    [data-testid="stSidebar"] h2,
    [data-testid="stSidebar"] h3 {
        color: #a5b4fc !important;
        font-weight: 600;
    }

    /* 메인 헤더 영역 */
    .hero-header {
        background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.1));
        border: 1px solid rgba(99, 102, 241, 0.3);
        border-radius: 20px;
        padding: 32px 40px;
        margin-bottom: 28px;
        backdrop-filter: blur(10px);
    }
    .hero-title {
        font-family: 'Outfit', sans-serif;
        font-size: 2.2rem;
        font-weight: 800;
        color: #e2e8f0;
        margin: 0 0 8px 0;
        background: linear-gradient(135deg, #a5b4fc, #c4b5fd, #f9a8d4);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
    }
    .hero-subtitle {
        font-size: 1rem;
        color: #94a3b8;
        margin: 0;
        font-weight: 400;
    }
    .hero-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: rgba(99, 102, 241, 0.2);
        border: 1px solid rgba(99, 102, 241, 0.4);
        border-radius: 999px;
        padding: 4px 14px;
        font-size: 0.8rem;
        color: #a5b4fc;
        font-weight: 600;
        margin-bottom: 16px;
    }

    /* 탭 스타일 */
    .stTabs [data-baseweb="tab-list"] {
        background: rgba(255, 255, 255, 0.03);
        border-radius: 12px;
        padding: 6px;
        gap: 4px;
        border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .stTabs [data-baseweb="tab"] {
        border-radius: 8px;
        padding: 10px 24px;
        font-weight: 600;
        font-size: 0.9rem;
        color: #94a3b8 !important;
        background: transparent;
        border: none;
        transition: all 0.2s ease;
    }
    .stTabs [aria-selected="true"] {
        background: linear-gradient(135deg, #6366f1, #8b5cf6) !important;
        color: white !important;
        box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
    }
    .stTabs [data-baseweb="tab-panel"] {
        padding-top: 24px;
    }

    /* 카드 스타일 */
    .answer-card {
        background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.05));
        border: 1px solid rgba(99, 102, 241, 0.3);
        border-left: 5px solid #6366f1;
        border-radius: 16px;
        padding: 28px 32px;
        margin-top: 20px;
        backdrop-filter: blur(10px);
        box-shadow: 0 8px 32px rgba(99, 102, 241, 0.15);
    }
    .answer-title {
        font-family: 'Outfit', sans-serif;
        font-size: 1rem;
        font-weight: 700;
        color: #a5b4fc;
        margin-bottom: 14px;
        display: flex;
        align-items: center;
        gap: 8px;
    }
    .answer-text {
        font-size: 1rem;
        color: #e2e8f0;
        line-height: 1.75;
        margin-bottom: 20px;
    }
    .contact-badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: rgba(255, 255, 255, 0.07);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 8px;
        padding: 8px 16px;
        font-size: 0.9rem;
        color: #cbd5e1;
        font-weight: 500;
    }

    /* Selectbox & 입력 요소 */
    .stSelectbox [data-baseweb="select"] > div {
        background: rgba(255, 255, 255, 0.95) !important;
        border: 1px solid rgba(99, 102, 241, 0.35) !important;
        border-radius: 10px !important;
    }
    .stSelectbox [data-baseweb="select"] span {
        color: #1e293b !important;
        font-weight: 500;
    }
    .stSelectbox label {
        color: #a5b4fc !important;
        font-weight: 600;
        font-size: 0.9rem;
    }

    /* 채팅 메시지 */
    [data-testid="stChatMessage"] {
        border-radius: 14px;
        padding: 4px;
        margin-bottom: 8px;
    }
    [data-testid="stChatMessage"][data-testid*="user"] {
        background: rgba(99, 102, 241, 0.1);
    }
    [data-testid="stChatMessage"][data-testid*="assistant"] {
        background: rgba(139, 92, 246, 0.08);
    }

    /* 채팅 입력 (입력창 배경을 밝게 하고 글자를 어둡게 하여 가독성 확보) */
    [data-testid="stChatInput"] {
        border: 2px solid rgba(99, 102, 241, 0.4) !important;
        border-radius: 14px !important;
        background-color: rgba(255, 255, 255, 0.95) !important;
    }
    [data-testid="stChatInput"] textarea {
        color: #1e293b !important;
        background-color: transparent !important;
        font-weight: 500;
    }
    [data-testid="stChatInput"] button {
        color: #6366f1 !important; /* 전송 버튼 색상 */
    }

    /* 텍스트 색상 전반 */
    .stMarkdown, p {
        color: #e2e8f0;
    }
    
    /* 드롭다운 옵션 글자색(어둡게) */
    [data-baseweb="popover"] * {
        color: #1e293b !important;
    }
    h1, h2, h3, h4, h5 {
        color: #e2e8f0 !important;
    }

    /* 경고/에러 박스 */
    .stAlert {
        border-radius: 10px;
    }

    /* 사이드바 내 파일 업로더 */
    [data-testid="stFileUploader"] {
        background: rgba(255, 255, 255, 0.04);
        border: 1px dashed rgba(99, 102, 241, 0.4);
        border-radius: 12px;
        padding: 8px;
    }

    /* 구분선 */
    hr {
        border-color: rgba(255, 255, 255, 0.08) !important;
    }

    /* 스피너 */
    .stSpinner > div {
        border-top-color: #6366f1 !important;
    }

    /* 섹션 레이블 */
    .section-label {
        font-family: 'Outfit', sans-serif;
        font-size: 0.78rem;
        font-weight: 700;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: #6366f1;
        margin-bottom: 10px;
        margin-top: 24px;
    }

    /* 통계 카드 */
    .stat-card {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        padding: 16px;
        text-align: center;
    }
    .stat-number {
        font-family: 'Outfit', sans-serif;
        font-size: 2rem;
        font-weight: 800;
        color: #a5b4fc;
    }
    .stat-label {
        font-size: 0.8rem;
        color: #64748b;
        font-weight: 500;
    }

    /* 버튼 */
    .stButton > button {
        background: linear-gradient(135deg, #6366f1, #8b5cf6) !important;
        color: white !important;
        border: none !important;
        border-radius: 10px !important;
        font-weight: 600 !important;
        padding: 10px 24px !important;
        transition: all 0.2s ease !important;
        box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3) !important;
    }
    .stButton > button:hover {
        transform: translateY(-1px) !important;
        box-shadow: 0 6px 20px rgba(99, 102, 241, 0.45) !important;
    }
</style>
""", unsafe_allow_html=True)


# ─────────────────────────────────────────────
# 사이드바 구성
# ─────────────────────────────────────────────
with st.sidebar:
    st.markdown("## 🏢 인프라 헬프데스크")
    st.markdown("<hr>", unsafe_allow_html=True)

    # API 키 설정
    st.markdown('<div class="section-label">🔑 API 설정</div>', unsafe_allow_html=True)
    api_key_input = st.text_input(
        "OpenAI API Key",
        type="password",
        placeholder="sk-... 또는 JWT 토큰",
        help="LLM 서비스 API 키를 입력하세요."
    )

    # 하드코딩된 기본값 (필요 시 수정)
    DEFAULT_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NjI0MDg0MDEsIm5iZiI6MTc2MjQwODQwMSwia2V5X2lkIjoiZGMzY2YyOGYtOWZlMy00ODJkLWEwZjItMTIxMzFkZDExYWQyIn0.NAQ2DOF2p_NcSBTjkj4vzMcmSZT3eEII6VRYdUvd2PM"
    ACTIVE_API_KEY = api_key_input.strip() if api_key_input.strip() else DEFAULT_API_KEY

    st.markdown("<hr>", unsafe_allow_html=True)

    # 엑셀 파일 업로드
    st.markdown('<div class="section-label">📂 데이터 업로드</div>', unsafe_allow_html=True)
    uploaded_file = st.file_uploader(
        "엑셀 파일 (xlsx)",
        type=["xlsx"],
        help="카테고리, 질문, 답변, 담당 부서 및 연락처 컬럼이 포함된 엑셀 파일을 업로드하세요."
    )

    st.markdown("<hr>", unsafe_allow_html=True)
    st.markdown("""
    <div style="font-size:0.78rem; color:#64748b; line-height:1.6;">
    📌 <b style="color:#a5b4fc;">사용 방법</b><br>
    1. API 키 입력 (없으면 기본값 사용)<br>
    2. 엑셀 파일 업로드<br>
    3. 카테고리별 FAQ 탭에서 빠른 검색<br>
    4. AI 챗봇 탭에서 자유롭게 질문
    </div>
    """, unsafe_allow_html=True)

    st.markdown("<hr>", unsafe_allow_html=True)
    if st.button("🗑️ 채팅 기록 초기화"):
        st.session_state.chat_history = []
        st.session_state.pop("rag_chain", None)
        st.rerun()


# ─────────────────────────────────────────────
# 메인 헤더
# ─────────────────────────────────────────────
st.markdown("""
<div class="hero-header">
    <div class="hero-badge">🤖 AI-Powered · RAG 기반 검색</div>
    <h1 class="hero-title">사내 인프라 스마트 헬프데스크</h1>
    <p class="hero-subtitle">
        인프라 관련 FAQ를 빠르게 찾거나, AI 비서에게 자유롭게 질문해 보세요.<br>
        엑셀 문서에 등록된 정보만을 기반으로 정확하게 답변해 드립니다.
    </p>
</div>
""", unsafe_allow_html=True)


# ─────────────────────────────────────────────
# 데이터 로드 함수
# ─────────────────────────────────────────────
@st.cache_data
def load_excel_data(file_bytes: bytes):
    try:
        df = pd.read_excel(io.BytesIO(file_bytes))
        df['카테고리'] = df['카테고리'].fillna('기타').astype(str).str.strip()
        df['질문'] = df['질문'].fillna('').astype(str).str.strip()
        df['답변'] = df['답변'].fillna('').astype(str).str.strip()
        if '담당 부서 및 연락처' in df.columns:
            df['담당 부서 및 연락처'] = df['담당 부서 및 연락처'].fillna('담당자 미지정').astype(str).str.strip()
        else:
            df['담당 부서 및 연락처'] = '담당자 미지정'
        return df
    except Exception as e:
        st.error(f"엑셀 파일 로드 오류: {e}")
        return pd.DataFrame()

def load_default_excel():
    """기본 경로 엑셀 로드 (업로드 없을 때 fallback)"""
    default_path = r"C:\Users\User\Downloads\0527_3\dummy_data.xlsx"
    if os.path.exists(default_path):
        try:
            df = pd.read_excel(default_path)
            df['카테고리'] = df['카테고리'].fillna('기타').astype(str).str.strip()
            df['질문'] = df['질문'].fillna('').astype(str).str.strip()
            df['답변'] = df['답변'].fillna('').astype(str).str.strip()
            if '담당 부서 및 연락처' in df.columns:
                df['담당 부서 및 연락처'] = df['담당 부서 및 연락처'].fillna('담당자 미지정').astype(str).str.strip()
            else:
                df['담당 부서 및 연락처'] = '담당자 미지정'
            return df
        except Exception:
            return pd.DataFrame()
    return pd.DataFrame()


# ─────────────────────────────────────────────
# 데이터 준비
# ─────────────────────────────────────────────
if uploaded_file is not None:
    df_data = load_excel_data(uploaded_file.read())
    data_source = f"📄 {uploaded_file.name}"
else:
    df_data = load_default_excel()
    data_source = "📄 dummy_data.xlsx (기본 파일)"

# 사이드바 통계
if not df_data.empty:
    with st.sidebar:
        st.markdown('<div class="section-label">📊 데이터 현황</div>', unsafe_allow_html=True)
        col_s1, col_s2 = st.columns(2)
        with col_s1:
            st.markdown(f"""
            <div class="stat-card">
                <div class="stat-number">{len(df_data['카테고리'].unique())}</div>
                <div class="stat-label">카테고리</div>
            </div>""", unsafe_allow_html=True)
        with col_s2:
            st.markdown(f"""
            <div class="stat-card">
                <div class="stat-number">{len(df_data)}</div>
                <div class="stat-label">전체 FAQ</div>
            </div>""", unsafe_allow_html=True)
        st.markdown(f"<div style='font-size:0.75rem;color:#64748b;margin-top:8px;'>{data_source}</div>",
                    unsafe_allow_html=True)


# ─────────────────────────────────────────────
# RAG 에이전트 초기화 (캐싱)
# ─────────────────────────────────────────────
@st.cache_resource
def init_rag_chain(api_key: str, df_hash: int):
    """
    api_key와 df_hash를 인자로 받아 변경 시 자동 재초기화.
    df_hash: 데이터프레임 변경 감지용 해시값
    """
    global df_data  # 전역 df_data 사용
    if df_data is None or df_data.empty:
        return None

    df_temp = df_data.copy()
    df_temp['combined_text'] = (
        "카테고리: " + df_temp['카테고리'] + "\n" +
        "질문: " + df_temp['질문'] + "\n" +
        "답변: " + df_temp['답변'] + "\n" +
        "담당 부서 및 연락처: " + df_temp['담당 부서 및 연락처']
    )

    loader = DataFrameLoader(df_temp, page_content_column="combined_text")
    docs = loader.load()

    text_splitter = RecursiveCharacterTextSplitter(chunk_size=600, chunk_overlap=100)
    splits = text_splitter.split_documents(docs)

    embeddings_base_url = "https://mlapi.run/b54ff33e-6d14-42df-93f9-0f1132160ee8/v1"
    embeddings = OpenAIEmbeddings(
        model="openai/text-embedding-3-small",
        openai_api_key=api_key,
        openai_api_base=embeddings_base_url
    )
    vectorstore = FAISS.from_documents(splits, embeddings)
    faiss_retriever = vectorstore.as_retriever(search_kwargs={"k": 4})

    bm25_retriever = BM25Retriever.from_documents(splits)
    bm25_retriever.k = 4

    ensemble_retriever = EnsembleRetriever(
        retrievers=[bm25_retriever, faiss_retriever],
        weights=[0.4, 0.6]
    )

    llm_base_url = "https://mlapi.run/40cc17ae-a89b-4f12-a7d6-13293180fc87/v1"
    llm = ChatOpenAI(
        model="openai/gpt-4o-mini",
        base_url=llm_base_url,
        api_key=api_key,
        temperature=0
    )

    prompt = ChatPromptTemplate.from_messages([
        ("system",
         "당신은 사내 인프라 전문 AI 비서입니다. "
         "반드시 아래 [문서 내용]에 있는 정보만을 참고하여 질문에 답변하세요.\n"
         "문서에 없는 내용은 절대 추측하거나 지어내지 마세요.\n"
         "답변을 찾을 수 없는 경우, 반드시 아래 문구를 출력하세요:\n"
         "\"죄송합니다. 제공된 인프라 문서에서 관련 정보를 찾을 수 없습니다. "
         "자세한 사항은 사내 담당 부서에 문의해 주시기 바랍니다.\"\n\n"
         "답변은 친절하고 명확하게 작성하되, 관련 담당 부서가 있으면 반드시 안내해 주세요.\n\n"
         "[문서 내용]\n{context}"),
        ("user", "{input}")
    ])

    document_chain = create_stuff_documents_chain(llm, prompt)
    retrieval_chain = create_retrieval_chain(ensemble_retriever, document_chain)
    return retrieval_chain


# ─────────────────────────────────────────────
# 탭 구성
# ─────────────────────────────────────────────
tab1, tab2 = st.tabs(["📂  카테고리별 FAQ 바로 찾기", "💬  AI 인프라 비서 (챗봇)"])


# ══════════════════════════════════════════════
# Tab 1: 카테고리별 FAQ
# ══════════════════════════════════════════════
with tab1:
    if df_data.empty:
        st.warning("⚠️ 엑셀 파일을 사이드바에서 업로드하거나 기본 파일을 확인해 주세요.")
    else:
        st.markdown("""
        <p style="color:#94a3b8; font-size:0.95rem; margin-bottom:24px;">
        카테고리를 먼저 선택하고, 질문을 고르면 공식 답변을 바로 확인할 수 있습니다.
        </p>
        """, unsafe_allow_html=True)

        col1, col2 = st.columns([1, 2])

        with col1:
            st.markdown('<div class="section-label">① 카테고리 선택</div>', unsafe_allow_html=True)
            categories = sorted(df_data['카테고리'].unique())
            selected_category = st.selectbox(
                "카테고리",
                categories,
                label_visibility="collapsed",
                key="faq_category"
            )

            # 카테고리 FAQ 수 표시
            cat_count = len(df_data[df_data['카테고리'] == selected_category])
            st.markdown(f"""
            <div style="font-size:0.8rem; color:#64748b; margin-top:6px;">
            총 <b style="color:#a5b4fc;">{cat_count}개</b>의 FAQ가 있습니다.
            </div>
            """, unsafe_allow_html=True)

        with col2:
            st.markdown('<div class="section-label">② 질문 선택</div>', unsafe_allow_html=True)
            filtered_df = df_data[df_data['카테고리'] == selected_category]
            questions = filtered_df['질문'].unique()
            selected_question = st.selectbox(
                "질문",
                questions,
                label_visibility="collapsed",
                key="faq_question"
            )

        # 답변 카드
        if selected_question:
            ans_row = filtered_df[filtered_df['질문'] == selected_question].iloc[0]
            contact = ans_row.get('담당 부서 및 연락처', '담당자 미지정')

            st.markdown(f"""
            <div class="answer-card">
                <div class="answer-title">💡 공식 답변</div>
                <div class="answer-text">{ans_row['답변']}</div>
                <div class="contact-badge">
                    📞 담당 부서 &nbsp;|&nbsp; {contact}
                </div>
            </div>
            """, unsafe_allow_html=True)


# ══════════════════════════════════════════════
# Tab 2: AI 챗봇
# ══════════════════════════════════════════════
with tab2:
    st.markdown("""
    <p style="color:#94a3b8; font-size:0.95rem; margin-bottom:20px;">
    엑셀에 등록된 사내 인프라 정보를 기반으로 AI가 검색해서 답변해 드립니다.<br>
    문서에 없는 내용은 답변하지 않으며, 담당 부서를 안내해 드립니다.
    </p>
    """, unsafe_allow_html=True)

    if df_data.empty:
        st.warning("⚠️ 사이드바에서 엑셀 파일을 업로드하면 AI 챗봇을 사용할 수 있습니다.")
    else:
        # RAG 체인 초기화
        df_hash = hash(tuple(df_data['질문'].tolist()))
        rag_chain = None
        try:
            rag_chain = init_rag_chain(ACTIVE_API_KEY, df_hash)
        except Exception as e:
            st.error(f"AI 시스템 초기화 오류: {e}")

        if rag_chain:
            # 채팅 히스토리 초기화
            if "chat_history" not in st.session_state:
                st.session_state.chat_history = []

            # 기존 채팅 출력
            for msg in st.session_state.chat_history:
                with st.chat_message(msg["role"]):
                    st.markdown(msg["content"])

            # 새 입력 처리
            if user_input := st.chat_input("문의 내용을 입력하세요.", key="chat_input_main"):
                # 사용자 메시지 출력 및 저장
                with st.chat_message("user"):
                    st.markdown(user_input)
                st.session_state.chat_history.append({"role": "user", "content": user_input})

                # AI 응답 생성
                with st.chat_message("assistant"):
                    with st.spinner("📚 문서 검색 중..."):
                        try:
                            response = rag_chain.invoke({"input": user_input})
                            answer = response["answer"]
                        except Exception as e:
                            answer = f"⚠️ 오류가 발생했습니다: {e}"
                    st.markdown(answer)
                    st.session_state.chat_history.append({"role": "assistant", "content": answer})
        else:
            st.warning("⚠️ AI 시스템을 시작할 수 없습니다. API 키와 데이터를 확인해 주세요.")
