const API_BASE = 'https://youtube-comments-sentiment-analyzer.onrender.com';

document.addEventListener('DOMContentLoaded', async () => {

  document.getElementById('analyzeBtn').addEventListener('click', startAnalysis);
  document.getElementById('resetBtn').addEventListener('click', resetView);

  await checkTab();
  await checkServer();

});

// ─────────────────────────────────────────────
// TAB CHECK
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// SERVER CHECK
// ─────────────────────────────────────────────
async function checkServer() {

  const dot = document.getElementById('statusDot');

  try {

    const res = await fetch(`${API_BASE}/health`);

    if (!res.ok) throw new Error();

    dot.classList.remove('error');
    dot.classList.add('online');

    document.getElementById('footerText').textContent =
      '✓ Backend connected · Hybrid AI';

  } catch {

    dot.classList.remove('online');
    dot.classList.add('error');

    document.getElementById('footerText').textContent =
      '✗ Backend offline';
  }
}

// ─────────────────────────────────────────────
// MAIN ANALYSIS
// ─────────────────────────────────────────────
async function startAnalysis() {

  const btn = document.getElementById('analyzeBtn');
  const loading = document.getElementById('loadingSection');
  const results = document.getElementById('resultsSection');
  const errorBox = document.getElementById('errorBox');
  const stepEl = document.getElementById('loadingStep');

  btn.disabled = true;

  // reset UI
  errorBox.classList.remove('visible');
  results.classList.remove('visible');

  // show loading
  loading.classList.add('visible');

  // force UI paint
  await new Promise(requestAnimationFrame);

  // step animation
  const steps = [
    'Opening video...',
    'Accessing comments section...',
    'Auto-scrolling comments...',
    'Extracting comments...',
    'Sending to backend...',
    'Running AI analysis...',
    'Preparing insights...'
  ];

  let stepIndex = 0;

  const interval = setInterval(() => {

    if (stepIndex < steps.length) {
      stepEl.textContent = steps[stepIndex];
      stepIndex++;
    }

  }, 700);

  try {

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const count = parseInt(document.getElementById('commentCount').value);

    // ─── AUTO SCROLL + SCRAPE ───
    const injected = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: autoScrollAndScrape,
      args: [count]
    });

    const comments = injected?.[0]?.result || [];

    if (!comments.length) {
      throw new Error("No comments found. Try again.");
    }

    // ─── SEND TO BACKEND ───
    const response = await fetch(`${API_BASE}/analyze`, {

      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comments })

    });

    if (!response.ok) {
      throw new Error("Backend error");
    }

    const data = await response.json();

    // stop loading
    clearInterval(interval);
    loading.classList.remove('visible');

    // render
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

// ─────────────────────────────────────────────
// AUTO SCROLL + SCRAPER (FIXED CORE LOGIC)
// ─────────────────────────────────────────────
async function autoScrollAndScrape(maxCount) {
  const delay = ms => new Promise(res => setTimeout(res, ms));

  // First, scroll down a bit to trigger comment section load
  window.scrollTo(0, 600);
  await delay(2000); // Wait for comments to initialize

  let collected = new Set();
  let lastCount = 0;
  let noChangeStreak = 0;

  while (collected.size < maxCount && noChangeStreak < 4) {
    // Scrape what's currently visible
    const elements = document.querySelectorAll('#content-text');
    elements.forEach(el => {
      const text = el.innerText.trim();
      if (text.length > 5) collected.add(text);
    });

    // If we have enough, stop
    if (collected.size >= maxCount) break;

    // Scroll down more
    window.scrollTo(0, document.documentElement.scrollHeight);
    await delay(1800); // Give YouTube time to load more comments

    // Check if new comments appeared
    if (collected.size === lastCount) {
      noChangeStreak++;
    } else {
      noChangeStreak = 0;
      lastCount = collected.size;
    }
  }

  return Array.from(collected).slice(0, maxCount);
}

// ─────────────────────────────────────────────
// RENDER RESULTS (FIXED SCORE LOGIC)
// ─────────────────────────────────────────────
function renderResults(data) {

  const { summary, top_positive, top_negative, keywords } = data;

  const total = summary.total || 1;
  const pos = summary.positive || 0;
  const neg = summary.negative || 0;

  // ✅ REAL SCORE FIX
  const scorePercent = Math.round((pos / total) * 100);

  document.getElementById('scoreValue').textContent =
    `${scorePercent}%`;

  document.getElementById('scoreDesc').textContent =
    scorePercent >= 50 ? '🟢 Positive Audience' : '🔴 Negative Audience';

  document.getElementById('totalCount').textContent = total;
  document.getElementById('avgScore').textContent = summary.avg_compound.toFixed(3);

  document.getElementById('maxPos').textContent = pos;
  document.getElementById('maxNeg').textContent = neg;

  // bars
  const posPercent = (pos / total) * 100;
  const negPercent = (neg / total) * 100;

  document.getElementById('posBar').style.width = `${posPercent}%`;
  document.getElementById('negBar').style.width = `${negPercent}%`;

  document.getElementById('posCount').textContent = pos;
  document.getElementById('negCount').textContent = neg;

  // badges
  document.getElementById('posBadge').textContent =
    top_positive?.length || 0;

  document.getElementById('negBadge').textContent =
    top_negative?.length || 0;

  // keywords
  const kw = document.getElementById('keywords');
  kw.innerHTML = '';

  (keywords || []).forEach(k => {

    const span = document.createElement('span');
    span.className = 'keyword-tag';
    span.textContent = k;

    kw.appendChild(span);

  });

  // positive comments
  const posBox = document.getElementById('topPositive');
  posBox.innerHTML = '';

  (top_positive || []).forEach(c => {

    posBox.innerHTML += `
      <div class="comment-card pos">
        <span class="comment-score">${c.score.toFixed(2)}</span>
        ${c.text}
      </div>`;

  });

  // negative comments
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

// ─────────────────────────────────────────────
// RESET
// ─────────────────────────────────────────────
function resetView() {

  document.getElementById('resultsSection').classList.remove('visible');

  document.getElementById('analyzeBtn').disabled = false;

  document.getElementById('resetBtn').style.display = 'none';

}