// Content script — runs on every YouTube watch page
// This adds a small floating badge on the page showing quick sentiment status

let overlayInjected = false;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'SHOW_OVERLAY') {
    showOverlay(msg.data);
  }
  if (msg.type === 'HIDE_OVERLAY') {
    hideOverlay();
  }
});

function showOverlay(data) {
  let existing = document.getElementById('yt-sentiment-overlay');
  if (existing) existing.remove();

  const { summary } = data;
  const score = summary.avg_compound;

  let emoji = '😐';
  let color = '#ffb800';
  let label = 'Mixed';

  if (score >= 0.05) { emoji = '😊'; color = '#00e5a0'; label = 'Positive'; }
  else if (score <= -0.05) { emoji = '😡'; color = '#ff3c5f'; label = 'Negative'; }

  const overlay = document.createElement('div');
  overlay.id = 'yt-sentiment-overlay';
  overlay.innerHTML = `
    <div style="font-size:20px">${emoji}</div>
    <div style="font-size:11px;font-weight:700;color:${color};font-family:monospace">${label}</div>
    <div style="font-size:9px;color:#6b6b8a;font-family:monospace">${summary.total} comments</div>
  `;

  overlay.style.cssText = `
    position: fixed;
    bottom: 80px;
    right: 20px;
    background: #0a0a0f;
    border: 1px solid #2a2a3a;
    border-left: 3px solid ${color};
    border-radius: 10px;
    padding: 10px 14px;
    z-index: 99999;
    text-align: center;
    cursor: pointer;
    box-shadow: 0 4px 24px rgba(0,0,0,0.5);
    animation: slideIn 0.3s ease;
  `;

  overlay.title = 'Click to dismiss';
  overlay.addEventListener('click', () => overlay.remove());

  document.body.appendChild(overlay);
}

function hideOverlay() {
  const el = document.getElementById('yt-sentiment-overlay');
  if (el) el.remove();
}
