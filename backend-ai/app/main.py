from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI(
    title="Shoes Store AI & ML Microservice",
    description="Microservice thông minh phục vụ Gợi ý sản phẩm và Phân tích cảm xúc đánh giá tiếng Việt",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SentimentRequest(BaseModel):
    text: str
    product_id: Optional[str] = None

class SentimentResponse(BaseModel):
    sentiment_label: str  # POSITIVE, NEGATIVE, NEUTRAL
    sentiment_score: float
    fit_feedback: Optional[str] = None  # RUNS_SMALL, TRUE_TO_SIZE, RUNS_LARGE

class RecommendRequest(BaseModel):
    user_id: str
    viewed_product_ids: Optional[List[str]] = []
    limit: Optional[int] = 6

class RecommendResponse(BaseModel):
    recommended_product_ids: List[str]
    algorithm: str

@app.get("/")
def root():
    return {
        "service": "Shoes Store AI Microservice",
        "status": "online",
        "docs": "/docs",
    }

@app.get("/api/v1/health")
def health_check():
    return {"status": "healthy", "service": "AI Microservice"}

@app.post("/api/v1/sentiment-analyze", response_model=SentimentResponse)
def analyze_sentiment(payload: SentimentRequest):
    text_lower = payload.text.lower()
    
    # Heuristic / Rule-based ban đầu cho độ vừa size
    fit_feedback = "TRUE_TO_SIZE"
    if any(w in text_lower for w in ["chật", "nhỏ hơn", "tăng size", "bó chân"]):
        fit_feedback = "RUNS_SMALL"
    elif any(w in text_lower for w in ["rộng", "to hơn", "lùi size", "dư gót"]):
        fit_feedback = "RUNS_LARGE"

    # Phân loại cảm xúc cơ sở
    positive_words = ["đẹp", "êm", "tuyệt", "ưng", "chất lượng", "thích", "nhẹ", "chuẩn", "tốt"]
    negative_words = ["xấu", "lỗi", "rách", "cứng", "đau", "kém", "thất vọng", "bung keo"]

    pos_count = sum(1 for w in positive_words if w in text_lower)
    neg_count = sum(1 for w in negative_words if w in text_lower)

    if pos_count > neg_count:
        label = "POSITIVE"
        score = 0.88
    elif neg_count > pos_count:
        label = "NEGATIVE"
        score = 0.85
    else:
        label = "NEUTRAL"
        score = 0.60

    return SentimentResponse(
        sentiment_label=label,
        sentiment_score=score,
        fit_feedback=fit_feedback,
    )

@app.post("/api/v1/recommend", response_model=RecommendResponse)
def get_recommendations(payload: RecommendRequest):
    # Khởi tạo danh sách ID mẫu hoặc lấy từ ma trận tương tác
    return RecommendResponse(
        recommended_product_ids=[],
        algorithm="HYBRID_CF_CONTENT",
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
