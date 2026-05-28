from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
from typing import List, Optional
import os
import sqlite3

from rag import load_excel_data, init_rag_chain

app = FastAPI(title="Infra Helpdesk API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for prototype
global_state = {
    "df": pd.DataFrame(),
    "api_key": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NjI0MDg0MDEsIm5iZiI6MTc2MjQwODQwMSwia2V5X2lkIjoiZGMzY2YyOGYtOWZlMy00ODJkLWEwZjItMTIxMzFkZDExYWQyIn0.NAQ2DOF2p_NcSBTjkj4vzMcmSZT3eEII6VRYdUvd2PM",
    "rag_chain": None
}

def reload_rag_chain():
    if not global_state["df"].empty:
        global_state["rag_chain"] = init_rag_chain(global_state["api_key"], global_state["df"])
    else:
        global_state["rag_chain"] = None

def init_db():
    db_path = os.path.join(os.path.dirname(__file__), "stats.db")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS query_logs_v2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            query TEXT,
            category TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

@app.on_event("startup")
async def startup_event():
    init_db()
    # Load default data if exists (Permanent Storage)
    default_path = os.path.join(os.path.dirname(__file__), "data.xlsx")
    if os.path.exists(default_path):
        with open(default_path, "rb") as f:
            global_state["df"] = load_excel_data(f.read())
        reload_rag_chain()

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        df = load_excel_data(contents)
        global_state["df"] = df
        reload_rag_chain()
        return {"status": "success", "message": f"File {file.filename} uploaded successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ChatRequest(BaseModel):
    query: str
    api_key: Optional[str] = None

@app.post("/chat")
async def chat(request: ChatRequest):
    if request.api_key and request.api_key.strip() != "" and request.api_key != global_state["api_key"]:
        global_state["api_key"] = request.api_key
        reload_rag_chain()
        
    chain = global_state["rag_chain"]
    if chain is None:
        raise HTTPException(status_code=400, detail="Data not loaded. Please upload a file first.")
        
    try:
        response = chain.invoke({"input": request.query})
        
        # Try to extract category from the retrieved context
        category = "알 수 없음"
        if "context" in response and len(response["context"]) > 0:
            first_doc = response["context"][0].page_content
            # first_doc starts with: 카테고리: [Category]\n질문: ...
            if first_doc.startswith("카테고리:"):
                category = first_doc.split("\n")[0].replace("카테고리:", "").strip()
        
        try:
            # Log query to DB
            db_path = os.path.join(os.path.dirname(__file__), "stats.db")
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute("INSERT INTO query_logs_v2 (query, category) VALUES (?, ?)", (request.query, category))
            conn.commit()
            conn.close()
        except Exception as e:
            print("Failed to log query:", e)
            
        return {"answer": response["answer"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/categories")
async def get_categories():
    df = global_state["df"]
    if df.empty:
        return {"categories": []}
    return {"categories": sorted(df['카테고리'].unique().tolist())}

@app.get("/faq/{category:path}")
async def get_faq_by_category(category: str):
    df = global_state["df"]
    if df.empty:
        return {"faqs": []}
    filtered = df[df['카테고리'] == category]
    
    faqs = []
    for _, row in filtered.iterrows():
        faqs.append({
            "question": row['질문'],
            "answer": row['답변'],
            "contact": row['담당 부서 및 연락처']
        })
    return {"faqs": faqs}

@app.get("/stats")
async def get_stats():
    try:
        db_path = os.path.join(os.path.dirname(__file__), "stats.db")
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        # 1. Top queries
        cursor.execute('''
            SELECT query, category, COUNT(*) as count 
            FROM query_logs_v2 
            GROUP BY query, category 
            ORDER BY count DESC 
            LIMIT 50
        ''')
        query_rows = cursor.fetchall()
        
        # 2. Category distribution
        cursor.execute('''
            SELECT category, COUNT(*) as count 
            FROM query_logs_v2 
            GROUP BY category 
            ORDER BY count DESC
        ''')
        category_rows = cursor.fetchall()
        
        conn.close()
        
        queries = [{"query": row[0], "category": row[1], "count": row[2]} for row in query_rows]
        categories = [{"name": row[0], "value": row[1]} for row in category_rows]
        
        return {"queries": queries, "categories": categories}
    except Exception as e:
        print("Failed to fetch stats:", e)
        return {"queries": [], "categories": []}
