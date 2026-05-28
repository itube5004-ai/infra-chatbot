import pandas as pd
import io
from langchain_community.document_loaders import DataFrameLoader
from langchain_community.vectorstores import FAISS
from langchain_community.retrievers import BM25Retriever
from langchain_classic.retrievers import EnsembleRetriever
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_classic.chains import create_retrieval_chain
from langchain_classic.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate
from langchain_text_splitters import RecursiveCharacterTextSplitter

def load_excel_data(file_bytes: bytes) -> pd.DataFrame:
    df = pd.read_excel(io.BytesIO(file_bytes))
    df['카테고리'] = df['카테고리'].fillna('기타').astype(str).str.strip()
    df['질문'] = df['질문'].fillna('').astype(str).str.strip()
    df['답변'] = df['답변'].fillna('').astype(str).str.strip()
    if '담당 부서 및 연락처' in df.columns:
        df['담당 부서 및 연락처'] = df['담당 부서 및 연락처'].fillna('담당자 미지정').astype(str).str.strip()
    else:
        df['담당 부서 및 연락처'] = '담당자 미지정'
    return df

def init_rag_chain(api_key: str, df: pd.DataFrame):
    if df.empty:
        return None

    df_temp = df.copy()
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
