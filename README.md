# 🎬 YouTube Sentiment Analyzer Pro
### Full Chrome Extension + Python NLP Backend

---

## 📁 FILES IN THIS FOLDER

```
yt-sentiment-analyzer/
├── manifest.json       ← Chrome extension config
├── popup.html          ← Beautiful popup UI (opens when you click icon)
├── popup.js            ← Popup logic (talks to Python backend)
├── content.js          ← Injected into YouTube page
├── overlay.css         ← Styles for YouTube page overlay
├── server.py           ← Python FastAPI + VADER NLP backend
├── requirements.txt    ← Python dependencies
└── README.md           ← This file
```

---

## ⚡ STEP 1 — Install Python Dependencies

Open your terminal (Command Prompt / PowerShell / Terminal):

```bash
pip install fastapi uvicorn nltk google-api-python-client pydantic
```

Or use the requirements file:

```bash
pip install -r requirements.txt
```

---

## ⚡ STEP 2 — Start the Python Backend Server

In your terminal, navigate to this folder and run:

```bash
python server.py
```

You should see:
```
🚀 YT Sentiment Analyzer Backend Starting...
📡 Running on: http://127.0.0.1:8000
📖 API Docs:   http://127.0.0.1:8000/docs
```

✅ Keep this terminal window open while using the extension.

---

## ⚡ STEP 3 — Load Extension into Chrome

1. Open Chrome and go to: `chrome://extensions`
2. Toggle **"Developer mode"** ON (top-right corner)
3. Click **"Load unpacked"**
4. Select THIS folder (`yt-sentiment-analyzer`)
5. The extension icon appears in your Chrome toolbar ✅

---

## ⚡ STEP 4 — Use It!

1. Go to any YouTube video: `https://www.youtube.com/watch?v=...`
2. **Scroll down** to load the comments section (important!)
3. Wait a few seconds for comments to appear
4. Click the extension icon in your toolbar
5. Choose how many comments to analyze (20 / 50 / 100)
6. Click **"⚡ Analyze Comments"**
7. See full sentiment analysis with:
   - Overall sentiment score
   - Positive / Neutral / Negative breakdown
   - Top positive and negative comments
   - Keyword extraction
   - Stats dashboard

---

## 🔧 TROUBLESHOOTING

| Problem | Solution |
|---|---|
| "Backend offline" red dot | Run `python server.py` in terminal |
| "No comments found" | Scroll down on YouTube to load comments |
| Extension not showing | Check `chrome://extensions` → it's enabled |
| Port 8000 in use | Change port in server.py and popup.js |

---

## 🚀 UPGRADE IDEAS (Next Steps)

### 1. Use YouTube Data API (More Comments)
Replace in-page scraping with real API calls:
- Get API key from console.cloud.google.com
- Enable "YouTube Data API v3"
- Use `googleapiclient` in server.py to fetch 500+ comments

### 2. Train Your Own Model
Replace VADER with a custom scikit-learn model:
- Download labeled dataset from Kaggle
- Train Logistic Regression / Naive Bayes
- Save with joblib → load in server.py

### 3. Add BERT (Deep Learning)
```bash
pip install transformers torch
```
Use `cardiffnlp/twitter-roberta-base-sentiment` for state-of-the-art accuracy.

---

## 📊 HOW IT WORKS

```
YouTube Page
     ↓
content.js scrapes visible comments from DOM
     ↓
popup.js sends comments to Python (localhost:8000)
     ↓
server.py cleans text + runs VADER NLP
     ↓
Returns: scores, summary, keywords, top comments
     ↓
popup.html displays beautiful results
```

---

## 📦 API REFERENCE

Base URL: `http://127.0.0.1:8000`

**GET /health** → Check if server is running

**POST /analyze**
```json
{
  "comments": ["Great video!", "Terrible content", "It was okay"]
}
```
Returns:
```json
{
  "summary": { "total": 3, "positive": 1, "neutral": 1, "negative": 1, "avg_compound": 0.01 },
  "top_positive": [...],
  "top_negative": [...],
  "keywords": ["great", "video", "content"]
}
```

---

Built with ❤️ using VADER NLP + FastAPI + Chrome Extensions API
