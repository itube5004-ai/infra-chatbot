from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
from typing import List, Optional
import os

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

@app.on_event("startup")
async def startup_event():
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
