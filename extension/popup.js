const API_BASE = "https://your-render-url.onrender.com";

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('analyzeBtn').addEventListener('click', startAnalysis);
  document.getElementById('resetBtn').addEventListener('click', resetView);

  await checkTab();
  await checkServer();
});

// ─── UTIL (FIXED) ─────────────────────
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── TAB CHECK ─────────────────────────
async function checkTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.url?.includes('youtube.com/watch')) {
    document.getElementById('notYoutube').style.display = 'block';
    document.getElementById('youtubeState').style.display = 'none';
    return;
  }

  document.getElementById('videoCard').classList.add('visible');
  document.getElementById('videoTitle').textContent =
    tab.title?.replace(' - YouTube', '') || 'YouTube Video';
}

// ─── SERVER CHECK ──────────────────────
async function checkServer() {
  const dot = document.getElementById('statusDot');

  try {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error();

    dot.classList.add('online');
    document.getElementById('footerText').textContent =
      '✓ Backend connected · Hybrid AI';
  } catch {
    dot.classList.add('error');
    document.getElementById('footerText').textContent =
      '✗ Backend offline';
  }
}

// ─── MAIN ANALYSIS (FIXED LOADING) ─────
async function startAnalysis() {

  const btn = document.getElementById('analyzeBtn');
  const loading = document.getElementById('loadingSection');
  const results = document.getElementById('resultsSection');
  const errorBox = document.getElementById('errorBox');
  const stepEl = document.getElementById('loadingStep');

  btn.disabled = true;

  errorBox.classList.remove('visible');
  results.classList.remove('visible');

  // ✅ SHOW LOADING FIRST
  loading.classList.add('visible');

  // 🔥 FORCE BROWSER TO RENDER UI BEFORE HEAVY TASKS
  await delay(50);

  const steps = [
    'Loading YouTube page...',
    'Scrolling comments...',
    'Scraping comments...',
    'Sending to AI model...',
    'Generating results...'
  ];

  let i = 0;
  const interval = setInterval(() => {
    if (i < steps.length) {
      stepEl.textContent = steps[i++];
    }
  }, 700);

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const count = parseInt(document.getElementById('commentCount').value);

    // scroll
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.scrollTo(0, document.documentElement.scrollHeight)
    });

    await delay(800); // 🔥 give YouTube time to load comments

    // scrape
    const injected = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: scrapeComments,
      args: [count]
    });

    const comments = injected?.[0]?.result || [];

    if (!comments.length) {
      throw new Error("No comments found");
    }

    // backend call
    const response = await fetch(`${API_BASE}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comments })
    });

    const data = await response.json();

    clearInterval(interval);
    loading.classList.remove('visible');

    renderResults(data);
    results.classList.add('visible');

    document.getElementById('resetBtn').style.display = 'block';

  } catch (err) {

    clearInterval(interval);
    loading.classList.remove('visible');

    errorBox.classList.add('visible');
    document.getElementById('errorMsg').textContent = err.message;

    btn.disabled = false;
  }
}

// ─── SCRAPER ───────────────────────────
function scrapeComments(maxCount) {
  const els = document.querySelectorAll('#content-text');
  const comments = [];

  els.forEach(el => {
    const text = el.innerText.trim();
    if (text.length > 5) comments.push(text);
  });

  return comments.slice(0, maxCount);
}

// ─── RENDER RESULTS ─────────────────────
function renderResults(data) {

  const { summary, top_positive, top_negative, keywords } = data;

  const total = summary.total || 1;
  const pos = summary.positive || 0;
  const neg = summary.negative || 0;

  const score = summary.avg_compound || 0;

  document.getElementById('scoreValue').textContent =
    Math.round((score + 1) * 50) + '%';

  document.getElementById('scoreDesc').textContent =
    score >= 0 ? '🟢 Positive Audience' : '🔴 Negative Audience';

  document.getElementById('totalCount').textContent = total;
  document.getElementById('avgScore').textContent = score.toFixed(3);
  document.getElementById('maxPos').textContent = pos;
  document.getElementById('maxNeg').textContent = neg;

  const posPercent = total ? (pos / total) * 100 : 0;
  const negPercent = total ? (neg / total) * 100 : 0;

  document.getElementById('posBar').style.width = `${posPercent}%`;
  document.getElementById('negBar').style.width = `${negPercent}%`;

  document.getElementById('posCount').textContent = pos;
  document.getElementById('negCount').textContent = neg;

  document.getElementById('posBadge').textContent =
    top_positive?.length || 0;

  document.getElementById('negBadge').textContent =
    top_negative?.length || 0;

  const kw = document.getElementById('keywords');
  kw.innerHTML = '';
  (keywords || []).forEach(k => {
    const s = document.createElement('span');
    s.className = 'keyword-tag';
    s.textContent = k;
    kw.appendChild(s);
  });

  const posBox = document.getElementById('topPositive');
  posBox.innerHTML = '';
  (top_positive || []).forEach(c => {
    posBox.innerHTML += `
      <div class="comment-card pos">
        <span class="comment-score">${c.score.toFixed(2)}</span>
        ${c.text}
      </div>`;
  });

  const negBox = document.getElementById('topNegative');
  negBox.innerHTML = '';
  (top_negative || []).forEach(c => {
    negBox.innerHTML += `
      <div class="comment-card neg">
        <span class="comment-score">${c.score.toFixed(2)}</span>
        ${c.text}
      </div>`;
  });
}

// ─── RESET ──────────────────────────────
function resetView() {
  document.getElementById('resultsSection').classList.remove('visible');
  document.getElementById('analyzeBtn').disabled = false;
  document.getElementById('resetBtn').style.display = 'none';
}