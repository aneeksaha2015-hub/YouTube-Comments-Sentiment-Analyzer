from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import nltk
import re
from collections import Counter
import pickle

from nltk.sentiment.vader import SentimentIntensityAnalyzer
from nltk.corpus import stopwords

app = FastAPI(title="YT Sentiment Analyzer API", version="3.2 FIXED FULL")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── GLOBALS ─────────────────────────────
sia = None
model = None
vectorizer = None
STOPWORDS = set()


# ─── STARTUP ─────────────────────────────
@app.on_event("startup")
def load_models():
    global sia, model, vectorizer, STOPWORDS

    nltk.download('vader_lexicon', quiet=True)
    nltk.download('stopwords', quiet=True)

    sia = SentimentIntensityAnalyzer()
    STOPWORDS = set(stopwords.words('english'))

    # 🔥 FIX: Safe loading (prevents crash on render)
    try:
        with open("model.pkl", "rb") as f:
            model = pickle.load(f)
    except Exception as e:
        print("Model load failed:", e)
        model = None

    try:
        with open("vectorizer.pkl", "rb") as f:
            vectorizer = pickle.load(f)
    except Exception as e:
        print("Vectorizer load failed:", e)
        vectorizer = None


# ─── REQUEST ─────────────────────────────
class AnalyzeRequest(BaseModel):
    comments: List[str]


class CommentResult(BaseModel):
    text: str
    sentiment: str
    score: float


class SummaryResult(BaseModel):
    total: int
    positive: int
    negative: int
    avg_compound: float


class AnalyzeResponse(BaseModel):
    summary: SummaryResult
    results: List[CommentResult]
    top_positive: List[CommentResult]
    top_negative: List[CommentResult]
    keywords: List[str]


# ─── CLEAN TEXT ───────────────────────────
def clean_text(text: str) -> str:
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'http\S+', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


# ─── FIXED HYBRID SENTIMENT ───────────────
def hybrid_sentiment(text: str):
    scores = sia.polarity_scores(text)
    compound = scores["compound"]

    text_lower = text.lower()

    sarcasm_words = [
        "yeah right", "as if", "wow great",
        "nice job", "what a joke", "great job ruining"
    ]

    # 🔥 FIX: Better sarcasm handling
    if any(w in text_lower for w in sarcasm_words):
        compound -= 0.35

    # 🔥 FIX: Strong rule thresholds first
    if compound >= 0.25:
        return "Positive", compound

    if compound <= -0.25:
        return "Negative", compound

    # 🔥 FIX: Safe ML fallback
    if model is not None and vectorizer is not None:
        try:
            X = vectorizer.transform([text])
            pred = model.predict(X)[0]

            if pred == 1:
                return "Positive", max(compound, 0.05)
            else:
                return "Negative", min(compound, -0.05)
        except Exception as e:
            print("ML fallback failed:", e)

    # fallback to VADER
    return ("Positive" if compound >= 0 else "Negative", compound)


# ─── KEYWORDS ─────────────────────────────
def extract_keywords(comments: List[str], top_n: int = 15):
    all_words = []

    for comment in comments:
        words = re.findall(r'\b[a-zA-Z]{3,}\b', comment.lower())
        filtered = [w for w in words if w not in STOPWORDS]
        all_words.extend(filtered)

    counter = Counter(all_words)

    generic = {
        "video", "like", "just", "really", "good",
        "great", "also", "make", "know", "watch", "still"
    }

    for g in generic:
        counter.pop(g, None)

    return [w for w, _ in counter.most_common(top_n)]


# ─── ROUTES ──────────────────────────────
@app.get("/")
def root():
    return {"message": "API running"}   # 🔥 FIX: prevents 404 on Render


@app.get("/health")
def health():
    return {"status": "ok", "model": "Hybrid FIXED FULL"}


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest):

    if not req.comments:
        raise HTTPException(status_code=400, detail="No comments provided")

    results = []
    pos = 0
    neg = 0
    total_score = 0

    for raw in req.comments:
        text = clean_text(raw)

        if not text or len(text) < 3:
            continue

        label, score = hybrid_sentiment(text)
        total_score += score

        if label == "Positive":
            pos += 1
        else:
            neg += 1

        results.append(CommentResult(
            text=text,
            sentiment=label,
            score=round(score, 4)
        ))

    total = len(results)

    if total == 0:
        raise HTTPException(status_code=422, detail="No valid comments")

    avg = total_score / total

    # 🔥 FIX: Proper sorting
    pos_sorted = sorted(
        [r for r in results if r.sentiment == "Positive"],
        key=lambda x: x.score,
        reverse=True
    )

    neg_sorted = sorted(
        [r for r in results if r.sentiment == "Negative"],
        key=lambda x: x.score
    )

    return AnalyzeResponse(
        summary=SummaryResult(
            total=total,
            positive=pos,
            negative=neg,
            avg_compound=round(avg, 4)
        ),
        results=results,
        top_positive=pos_sorted[:5],
        top_negative=neg_sorted[:5],
        keywords=extract_keywords([r.text for r in results])
    )