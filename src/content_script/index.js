// Content Script using Shadow DOM for maximum reliability
const CONTAINER_ID = 'it-translator-container';

console.log('[IT Translator] Initializing Shadow DOM version...');

let shadowRoot = null;
let floatBtn = null;
let overlayBox = null;
let boxBody = null;
let savedRange = null;

function initShadowDOM() {
  if (document.getElementById(CONTAINER_ID)) return;

  const container = document.createElement('div');
  container.id = CONTAINER_ID;
  container.style.position = 'absolute';
  container.style.top = '0';
  container.style.left = '0';
  container.style.zIndex = '2147483647';
  document.body.appendChild(container);

  shadowRoot = container.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = `
    .it-btn {
      position: absolute;
      padding: 6px 14px;
      background: linear-gradient(135deg, #6c63ff, #8b5cf6);
      color: #fff;
      font-family: 'Inter', sans-serif;
      font-size: 13px;
      font-weight: 600;
      border: none;
      border-radius: 20px;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
      display: none;
      white-space: nowrap;
      z-index: 1000;
    }

    .it-box {
      position: absolute;
      width: 420px;
      background: #1a1a1a;
      color: #efefef;
      font-family: 'Inter', -apple-system, sans-serif;
      border-radius: 12px;
      box-shadow: 0 15px 50px rgba(0,0,0,0.7);
      border: 1px solid #333;
      display: none;
      flex-direction: column;
      z-index: 999;
      animation: it-fade-in 0.2s ease-out;
    }

    @keyframes it-fade-in {
      from { opacity: 0; transform: translateY(5px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .it-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: #222;
      border-bottom: 1px solid #333;
      border-radius: 12px 12px 0 0;
    }

    .it-title {
      font-size: 11px;
      font-weight: 700;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .it-controls {
      display: flex;
      gap: 10px;
    }

    .it-action-btn {
      background: #333;
      color: #eee;
      border: none;
      padding: 5px 12px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .it-action-btn:hover { background: #444; color: #fff; }

    .it-body {
      padding: 16px;
      max-height: 350px;
      overflow-y: auto;
      font-size: 14px;
      line-height: 1.6;
      white-space: pre-wrap;
      scrollbar-width: thin;
      scrollbar-color: #444 transparent;
    }

    .it-footer {
      padding: 10px 16px;
      font-size: 10px;
      color: #555;
      background: #151515;
      border-top: 1px solid #252525;
      border-radius: 0 0 12px 12px;
      display: flex;
      justify-content: space-between;
    }

    .it-cursor {
      display: inline-block;
      width: 2px;
      height: 15px;
      background: #6c63ff;
      margin-left: 2px;
      animation: it-blink 1s infinite;
    }
    @keyframes it-blink { 50% { opacity: 0; } }
  `;
  shadowRoot.appendChild(style);

  // Floating Button
  floatBtn = document.createElement('button');
  floatBtn.className = 'it-btn';
  floatBtn.textContent = '⚡ Translate';
  floatBtn.onclick = (e) => {
    e.stopPropagation();
    onTranslateRequest();
  };
  shadowRoot.appendChild(floatBtn);

  // Overlay Box
  overlayBox = document.createElement('div');
  overlayBox.className = 'it-box';
  overlayBox.innerHTML = `
    <div class="it-header">
      <div class="it-title">Translate Selection</div>
      <div class="it-controls">
        <button class="it-action-btn" id="copy">Copy</button>
        <button class="it-action-btn" id="close">Close</button>
      </div>
    </div>
    <div class="it-body" id="content"></div>
    <div class="it-footer">
      <span>Gemma-2B Offline</span>
      <span>J2TEAM Style</span>
    </div>
  `;
  shadowRoot.appendChild(overlayBox);

  boxBody = overlayBox.querySelector('#content');
  overlayBox.querySelector('#close').onclick = hideBox;
  overlayBox.querySelector('#copy').onclick = () => {
    navigator.clipboard.writeText(boxBody.innerText);
    const btn = overlayBox.querySelector('#copy');
    btn.textContent = 'Copied!';
    setTimeout(() => btn.textContent = 'Copy', 2000);
  };
}

function showBtn(range) {
  initShadowDOM();
  const rect = range.getBoundingClientRect();
  floatBtn.style.top = `${window.scrollY + rect.top - 45}px`;
  floatBtn.style.left = `${window.scrollX + rect.left + rect.width / 2 - 50}px`;
  floatBtn.style.display = 'block';
  savedRange = range.cloneRange();
}

function hideBtn() {
  if (floatBtn) floatBtn.style.display = 'none';
}

function showBox(rect) {
  initShadowDOM();
  overlayBox.style.display = 'flex';

  // Position box below selection
  let top = window.scrollY + rect.bottom + 15;
  let left = window.scrollX + rect.left + rect.width / 2 - 210;

  // Clamp left
  left = Math.max(20, Math.min(left, window.innerWidth - 440));

  // Flip to top if no space below
  if (top + 300 > window.scrollY + window.innerHeight) {
    top = window.scrollY + rect.top - 320;
  }

  overlayBox.style.top = `${top}px`;
  overlayBox.style.left = `${left}px`;
  boxBody.innerHTML = '<i>Processing...</i>';
}

function hideBox() {
  if (overlayBox) overlayBox.style.display = 'none';
}

async function onTranslateRequest() {
  if (!savedRange) return;
  const text = savedRange.toString().trim();
  const rect = savedRange.getBoundingClientRect();
  const context = savedRange.commonAncestorContainer.parentElement.innerText.slice(0, 600);

  hideBtn();
  showBox(rect);

  console.log('── IT Translator Request ──');
  console.log('Source Text:', text);
  console.log('Context:', context);
  console.log('───────────────────────────');

  chrome.runtime.sendMessage({
    type: 'TRANSLATE_TEXT',
    text: text,
    context: context
  });
}

// ── Message Listener ──────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'GENERATE_PROGRESS') {
    if (overlayBox && overlayBox.style.display === 'flex') {
      const { partialText, done } = message.payload;
      if (boxBody.innerHTML === '<i>Processing...</i>') boxBody.innerHTML = '';

      boxBody.innerText = partialText;

      if (!done && !boxBody.querySelector('.it-cursor')) {
        const cursor = document.createElement('span');
        cursor.className = 'it-cursor';
        boxBody.appendChild(cursor);
      } else if (done) {
        const cursor = boxBody.querySelector('.it-cursor');
        if (cursor) cursor.remove();
      }
    }
  }
});

// ── Selection Detection ───────────────────────────────────────────────────────
document.addEventListener('mouseup', (e) => {
  // Ignore if clicking inside our container
  if (document.getElementById(CONTAINER_ID)?.contains(e.target)) return;

  setTimeout(() => {
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed && selection.toString().trim().length > 2) {
      showBtn(selection.getRangeAt(0));
    }
  }, 50);
});

document.addEventListener('mousedown', (e) => {
  if (document.getElementById(CONTAINER_ID)?.contains(e.target)) return;
  hideBtn();
  hideBox();
});

console.log('[IT Translator] Shadow DOM Content Script Ready.');
