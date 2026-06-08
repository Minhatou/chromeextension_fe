// Content Script using Shadow DOM for maximum reliability
const CONTAINER_ID = 'it-translator-container';

console.log('[IT Translator] Initializing Shadow DOM version...');

let shadowRoot = null;
let floatBtn = null;
let overlayBox = null;
let boxBody = null;
let savedRange = null;
let currentSourceText = '';
let progressInterval = null;

function renderMarkdown(text) {
  if (!text) return '';

  // Escape HTML to prevent XSS
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  // 1. Block code blocks: ```lang\ncode\n```
  html = html.replace(/```(?:[a-zA-Z0-9+#-]+)?\n([\s\S]*?)\n```/g, (match, code) => {
    return `<pre class="it-md-pre"><code class="it-md-code-block">${code}</code></pre>`;
  });
  html = html.replace(/```(?:[a-zA-Z0-9+#-]+)?([\s\S]*?)```/g, (match, code) => {
    return `<pre class="it-md-pre"><code class="it-md-code-block">${code}</code></pre>`;
  });

  // 2. Inline code: `code`
  html = html.replace(/`([^`\n]+)`/g, '<code class="it-md-code">$1</code>');

  // 3. Headers: ###, ##, #
  html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');

  // 4. Bold: **text** or __text__
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');

  // 5. Italic: *text* or _text_
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>');

  // 6. Lists: * or - at start of line
  html = html.replace(/^\s*[-*]\s+(.*?)$/gm, '<li>$1</li>');
  
  // Group adjacent <li> tags into <ul>
  html = html.replace(/(<li>[\s\S]*?<\/li>)/g, (match) => {
    return `<ul>${match}</ul>`;
  });
  // Clean up nested <ul><ul>
  html = html.replace(/<\/ul>\s*<ul>/g, '');

  // 7. Ordered lists: 1. 2. 3.
  html = html.replace(/^\s*\d+\.\s+(.*?)$/gm, '<li class="it-md-ol-item">$1</li>');
  html = html.replace(/((?:<li class="it-md-ol-item">.*?<\/li>\s*)+)/g, '<ol>$1</ol>');
  html = html.replace(/<li class="it-md-ol-item">/g, '<li>');

  // 8. Linebreaks: replace newlines with <br> unless they are in pre tags
  const parts = html.split(/(<pre[\s\S]*?<\/pre>)/g);
  for (let i = 0; i < parts.length; i++) {
    if (!parts[i].startsWith('<pre')) {
      parts[i] = parts[i].replace(/\n/g, '<br>');
    }
  }
  html = parts.join('');

  // Clean up double <br> or <br> right after/before block elements to prevent too much spacing
  html = html.replace(/<br>\s*<(ul|ol|li|pre|h1|h2|h3)/gi, '<$1');
  html = html.replace(/<\/(ul|ol|li|pre|h1|h2|h3)>\s*<br>/gi, '</$1>');

  return html;
}

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
    .it-float-menu {
      position: absolute;
      display: none;
      gap: 6px;
      z-index: 2147483647;
      background: rgba(26, 26, 26, 0.95);
      padding: 4px;
      border-radius: 24px;
      border: 1px solid #444;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      backdrop-filter: blur(8px);
      align-items: center;
    }
    
    .it-btn-item {
      padding: 6px 12px;
      background: transparent;
      color: #efefef;
      font-family: 'Inter', sans-serif;
      font-size: 12px;
      font-weight: 600;
      border: none;
      border-radius: 18px;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    
    .it-btn-item:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }
    
    .it-btn-item.primary {
      background: #ffffff;
      color: #000000;
    }
    
    .it-btn-item.primary:hover {
      background: #e5e5e5;
    }

    .it-box {
      position: absolute;
      width: 640px;
      max-width: 90vw;
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
      background: #ffffff;
      margin-left: 2px;
      animation: it-blink 1s infinite;
    }
    @keyframes it-blink { 50% { opacity: 0; } }

    .it-toast {
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 10px 20px;
      background: rgba(26, 26, 26, 0.95);
      color: #efefef;
      border: 1px solid #444;
      border-radius: 8px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
      font-family: 'Inter', sans-serif;
      font-size: 13px;
      z-index: 2147483647;
      animation: it-toast-in 0.3s ease-out;
    }
    @keyframes it-toast-in {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    /* Markdown Styles */
    .it-md-code {
      background: #2b2b2b;
      color: #ff7875;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'Courier New', Courier, monospace;
      font-size: 0.9em;
    }
    .it-md-pre {
      background: #111;
      padding: 10px;
      border-radius: 6px;
      overflow-x: auto;
      margin: 8px 0;
      border: 1px solid #222;
      white-space: pre;
    }
    .it-md-code-block {
      font-family: 'Courier New', Courier, monospace;
      font-size: 13px;
      color: #efefef;
    }
    .it-box h1, .it-box h2, .it-box h3 {
      margin-top: 12px;
      margin-bottom: 6px;
      font-weight: 600;
    }
    .it-box ul, .it-box ol {
      margin-top: 4px;
      margin-bottom: 8px;
      padding-left: 20px;
    }

    /* Light Theme Styles */
    .it-box.light-theme {
      background: #ffffff;
      color: #1a1a1a;
      border: 1px solid #ddd;
      box-shadow: 0 15px 50px rgba(0,0,0,0.15);
    }
    .it-box.light-theme .it-header {
      background: #f5f5f5;
      border-bottom: 1px solid #ddd;
    }
    .it-box.light-theme .it-title {
      color: #666;
    }
    .it-box.light-theme .it-action-btn {
      background: #e5e5e5;
      color: #333;
    }
    .it-box.light-theme .it-action-btn:hover {
      background: #d5d5d5;
      color: #000;
    }
    .it-box.light-theme .it-footer {
      background: #fafafa;
      border-top: 1px solid #eee;
    }
    .it-box.light-theme .it-md-code {
      background: #f0f0f0;
      color: #c41d7f;
    }
    .it-box.light-theme .it-md-pre {
      background: #f7f7f7;
      border: 1px solid #e8e8e8;
    }
    .it-box.light-theme .it-md-code-block {
      color: #1a1a1a;
    }
    @keyframes pulse {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
      70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
    }
  `;
  shadowRoot.appendChild(style);

  // Floating Menu
  floatBtn = document.createElement('div');
  floatBtn.className = 'it-float-menu';

  const ANTD_ICONS = {
    thunderbolt: `<svg viewBox="64 64 896 896" focusable="false" width="13px" height="13px" fill="currentColor" style="display: inline-block; vertical-align: -0.125em; margin-right: 6px;"><path d="M848 359.3H627.7L825.8 109c4.1-5.3.2-13-6.5-13H702c-4 0-7.7 2-10 5.4L332 581.3c-4.6 6.1-.3 14.7 7.3 14.7h220.3L361.6 915c-4.1 5.3-.2 13 6.5 13h117.3c4 0 7.7-2 10-5.4l359.9-479.9c4.7-6.1.4-14.7-7.3-14.7z"></path></svg>`,
    edit: `<svg viewBox="64 64 896 896" focusable="false" width="13px" height="13px" fill="currentColor" style="display: inline-block; vertical-align: -0.125em; margin-right: 6px;"><path d="M257.7 752c2 0 4-.2 6-.5L431.9 722c2-.4 3.9-1.3 5.3-2.8l423.9-423.9c3.9-3.9 3.9-10.2 0-14.1L694.7 114.7c-3.9-3.9-10.2-3.9-14.1 0L256.7 538.6c-1.5 1.5-2.4 3.4-2.8 5.3l-29.5 168.2a8 8 0 0 0 9.3 9.3l168.2-29.5c.2 0 .4.1.6.1zm251.6-491.9l122.8 122.8-378.2 378.2-122.8-122.8 378.2-378.2zm-283.7 385l90.7 90.7-119.7 21 29-111.7zM880 838H144c-17.7 0-32 14.3-32 32v36c0 4.4 3.6 8 8 8h752c4.4 0 8-3.6 8-8v-36c0-17.7-14.3-32-32-32z"></path></svg>`,
    search: `<svg viewBox="64 64 896 896" focusable="false" width="13px" height="13px" fill="currentColor" style="display: inline-block; vertical-align: -0.125em; margin-right: 6px;"><path d="M909.6 854.5L747.4 692.3c47.9-60.1 76.8-136.1 76.8-218.7c0-187.7-152-339.7-339.7-339.7s-339.7 152-339.7 339.7s152 339.7 339.7 339.7c82.6 0 158.6-28.9 218.7-76.8l162.2 162.2c1.2 1.2 2.8 1.8 4.5 1.8s3.3-.7 4.5-1.8l40.3-40.3c2.4-2.4 2.4-6.6-.1-9zm-570.8-381c0-123.7 100.3-224 224-224s224 100.3 224 224s-100.3 224-224 224s-224-100.3-224-224z"></path></svg>`,
    fileText: `<svg viewBox="64 64 896 896" focusable="false" width="13px" height="13px" fill="currentColor" style="display: inline-block; vertical-align: -0.125em; margin-right: 6px;"><path d="M854.6 288.6L658.8 92.8c-6-6-14.1-9.4-22.6-9.4H192c-17.7 0-32 14.3-32 32v832c0 17.7 14.3 32 32 32h640c17.7 0 32-14.3 32-32V311.3c0-8.5-3.4-16.6-9.4-22.7zM602 137.8L790.2 326H602V137.8zM792 886H232V148h290v210c0 17.7 14.3 32 32 32h238v496zM328 474h368c4.4 0 8-3.6 8-8v-36c0-4.4-3.6-8-8-8H328c-4.4 0-8 3.6-8 8v36c0 4.4 3.6 8 8 8zm0 144h368c4.4 0 8-3.6 8-8v-36c0-4.4-3.6-8-8-8H328c-4.4 0-8 3.6-8 8v36c0 4.4 3.6 8 8 8zm0 144h368c4.4 0 8-3.6 8-8v-36c0-4.4-3.6-8-8-8H328c-4.4 0-8 3.6-8 8v36c0 4.4 3.6 8 8 8z"></path></svg>`
  };

  const translateBtn = document.createElement('button');
  translateBtn.className = 'it-btn-item primary';
  translateBtn.innerHTML = `${ANTD_ICONS.thunderbolt} Dịch (Translate)`;
  translateBtn.onclick = (e) => {
    e.stopPropagation();
    onTranslateRequest('auto');
  };

  // reverseTranslateBtn is intentionally hidden — auto-detection handles VI→EN

  const explainBtn = document.createElement('button');
  explainBtn.className = 'it-btn-item';
  explainBtn.innerHTML = `${ANTD_ICONS.search} Giải thích (Explain)`;
  explainBtn.onclick = (e) => {
    e.stopPropagation();
    onTranslateRequest('explain');
  };

  const summarizeBtn = document.createElement('button');
  summarizeBtn.className = 'it-btn-item';
  summarizeBtn.innerHTML = `${ANTD_ICONS.fileText} Tóm tắt (Summary)`;
  summarizeBtn.onclick = (e) => {
    e.stopPropagation();
    onTranslateRequest('summarize');
  };

  floatBtn.appendChild(translateBtn);
  floatBtn.appendChild(explainBtn);
  floatBtn.appendChild(summarizeBtn);
  shadowRoot.appendChild(floatBtn);

  // Overlay Box
  overlayBox = document.createElement('div');
  overlayBox.className = 'it-box';
  overlayBox.innerHTML = `
    <div class="it-header">
      <div class="it-title">Translate Selection</div>
      <div class="it-controls">
        <button class="it-action-btn" id="theme-toggle">Light Mode</button>
        <button class="it-action-btn" id="dislike-btn" title="Không thích bản dịch này">👎 Dislike</button>
        <button class="it-action-btn" id="copy">Copy</button>
        <button class="it-action-btn" id="close">Close</button>
      </div>
    </div>
    <div class="it-body" id="content"></div>
    <div class="it-footer" >
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

  const dislikeBtn = overlayBox.querySelector('#dislike-btn');
  dislikeBtn.onclick = async () => {
    if (!currentSourceText) return;
    
    const authResult = await new Promise(resolve => {
      chrome.storage.local.get(['authSession'], resolve);
    });
    const session = authResult.authSession;
    if (!session || !session.uid) {
      showToast("Vui lòng đăng nhập để đánh giá bản dịch.");
      return;
    }
    
    try {
      const response = await fetch('https://hvmndoan-production.up.railway.app/api/translate/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: session.uid,
          source: currentSourceText,
          rating: 'dislike'
        })
      });
      
      if (response.ok) {
        showToast("Đang dịch lại...");
        dislikeBtn.style.color = '#ff4d4f';
        dislikeBtn.innerHTML = `👎 Disliked`;
        
        // Instantly trigger translate again, which will bypass cache due to the 'dislike' rating
        let targetLang = 'auto';
        const titleEl = overlayBox.querySelector('.it-title');
        if (titleEl) {
          if (titleEl.textContent.includes('Giải thích')) targetLang = 'explain';
          else if (titleEl.textContent.includes('Tóm tắt')) targetLang = 'summarize';
          else if (titleEl.textContent.includes('Dịch ngược')) targetLang = 'english';
        }
        
        onTranslateRequest(targetLang, currentSourceText);
      } else {
        showToast("Lỗi khi gửi đánh giá.");
      }
    } catch (err) {
      showToast("Không kết nối được server.");
    }
  };

  const themeBtn = overlayBox.querySelector('#theme-toggle');
  themeBtn.onclick = () => {
    overlayBox.classList.toggle('light-theme');
    if (overlayBox.classList.contains('light-theme')) {
      themeBtn.textContent = 'Dark Mode';
    } else {
      themeBtn.textContent = 'Light Mode';
    }
  };
}

function showBtn(range) {
  initShadowDOM();
  
  // Restore default button classes (Translate is primary, others are normal)
  const btns = floatBtn.querySelectorAll('.it-btn-item');
  btns.forEach((btn, idx) => {
    btn.className = idx === 0 ? 'it-btn-item primary' : 'it-btn-item';
  });

  const rect = range.getBoundingClientRect();
  floatBtn.style.top = `${window.scrollY + rect.top - 45}px`;
  floatBtn.style.left = `${window.scrollX + rect.left + rect.width / 2 - 160}px`;
  floatBtn.style.display = 'flex';
  savedRange = range.cloneRange();
}

function hideBtn() {
  console.log('[ContentScript] Hiding floatBtn');
  if (floatBtn) floatBtn.style.display = 'none';
}

function startProgressBar() {
  stopProgressBar();
  
  boxBody.innerHTML = `
    <div style="padding: 16px 8px; display: flex; flex-direction: column; gap: 10px; font-family: 'Inter', -apple-system, sans-serif;">
      <div style="font-size: 13px; color: #a1a1aa; text-align: left; font-weight: 600; display: flex; justify-content: space-between;">
        <span>Đang dịch văn bản...</span>
        <span id="it-progress-pct" style="color: #3b82f6; font-weight: 700;">0%</span>
      </div>
      <div style="width: 100%; height: 8px; background: rgba(255,255,255,0.05); border-radius: 999px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); position: relative;">
        <div id="it-progress-fill" style="width: 0%; height: 100%; background: linear-gradient(90deg, #3b82f6, #60a5fa); border-radius: 999px; transition: width 0.3s ease;"></div>
      </div>
      <div style="font-size: 11px; color: #71717a; text-align: left;">Hệ thống AI đang phân tích ngữ cảnh và dịch thuật ngữ IT...</div>
    </div>
  `;

  const fillEl = boxBody.querySelector('#it-progress-fill');
  const pctEl = boxBody.querySelector('#it-progress-pct');
  
  let progress = 0;
  progressInterval = setInterval(() => {
    if (progress < 85) {
      progress += Math.floor(Math.random() * 15) + 5;
      if (progress > 85) progress = 85;
    } else if (progress < 96) {
      progress += 1;
    }
    
    if (fillEl) fillEl.style.width = `${progress}%`;
    if (pctEl) pctEl.textContent = `${progress}%`;
  }, 250);
}

function stopProgressBar() {
  if (progressInterval) {
    clearInterval(progressInterval);
    progressInterval = null;
  }
}

function showBox(rect) {
  initShadowDOM();
  overlayBox.style.display = 'flex';

  // Measure the box's actual width to allow responsive scaling (max-width: 90vw)
  const boxWidth = overlayBox.offsetWidth || 640;
  const halfWidth = boxWidth / 2;

  let top, left;
  if (!rect || (rect.bottom === 200 && rect.left === 200 && rect.top === 100)) {
    // Center in viewport
    top = window.scrollY + (window.innerHeight - 320) / 2;
    left = window.scrollX + (window.innerWidth - boxWidth) / 2;
  } else {
    // Position box below selection
    top = window.scrollY + rect.bottom + 15;
    left = window.scrollX + rect.left + rect.width / 2 - halfWidth; // Center under selection

    // Clamp left (avoid overflowing right edge of screen: boxWidth + 20px padding)
    left = Math.max(20, Math.min(left, window.innerWidth - (boxWidth + 20)));

    // Flip to top if no space below
    if (top + 300 > window.scrollY + window.innerHeight) {
      top = window.scrollY + rect.top - 320;
    }
  }

  overlayBox.style.top = `${top}px`;
  overlayBox.style.left = `${left}px`;
  
  // Start the beautiful progress bar animation
  startProgressBar();

  const dislikeBtn = overlayBox.querySelector('#dislike-btn');
  if (dislikeBtn) {
    dislikeBtn.style.color = 'inherit';
    dislikeBtn.innerHTML = `👎 Dislike`;
  }
}

function hideBox() {
  console.log('[ContentScript] Hiding overlayBox');
  if (overlayBox) overlayBox.style.display = 'none';
}

function showLoginRequiredPopup(rect) {
  initShadowDOM();
  hideBtn();
  
  if (!rect) {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      rect = selection.getRangeAt(0).getBoundingClientRect();
    }
  }

  showBox(rect || { bottom: 200, left: 200, width: 100, top: 100 });
  
  const titleEl = overlayBox.querySelector('.it-title');
  if (titleEl) {
    titleEl.textContent = 'Yêu cầu đăng nhập';
  }

  boxBody.innerHTML = `
    <div style="
      text-align: center; 
      padding: 30px 20px; 
      font-family: 'Inter', -apple-system, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
    ">
      <div style="
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: rgba(239, 68, 68, 0.1);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 28px;
        margin-bottom: 8px;
        animation: pulse 2s infinite;
      ">🔒</div>
      <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: #ef4444;">Tính năng yêu cầu đăng nhập</h3>
      <p style="
        margin: 0; 
        color: #a1a1aa; 
        font-size: 14px; 
        line-height: 1.5;
        max-width: 320px;
      ">Vui lòng đăng nhập tài khoản IT Translator để sử dụng các tính năng dịch thuật, giải thích thuật ngữ và tóm tắt.</p>
      
      <button id="it-popup-login-btn" style="
        margin-top: 10px;
        background: #ffffff; 
        color: #000000; 
        font-weight: 700; 
        padding: 12px 28px; 
        border-radius: 999px; 
        border: none;
        font-size: 14px; 
        cursor: pointer; 
        transition: all 0.2s ease;
        box-shadow: 0 4px 15px rgba(255, 255, 255, 0.2);
      ">Đăng nhập ngay</button>
    </div>
  `;

  const loginBtn = boxBody.querySelector('#it-popup-login-btn');
  if (loginBtn) {
    loginBtn.onclick = () => {
      const url = typeof chrome !== 'undefined' && chrome.runtime
        ? chrome.runtime.getURL('src/dashboard/index.html')
        : '/src/dashboard/index.html';
      window.open(url, '_blank');
      hideBox();
    };
    loginBtn.onmouseover = () => { 
      loginBtn.style.background = '#e5e5e5';
      loginBtn.style.transform = 'translateY(-1px)';
    };
    loginBtn.onmouseout = () => { 
      loginBtn.style.background = '#ffffff'; 
      loginBtn.style.transform = 'translateY(0)';
    };
  }
}

// Simple heuristic: checks if text is predominantly Vietnamese
// Vietnamese uses Latin script + diacritics; a quick check for common VI characters is sufficient.
function isVietnamese(text) {
  // Vietnamese-specific characters (unique diacritics not found in other Latin languages)
  const viPattern = /[àáâãèéêìíòóôõùúýăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳýỷỹỵÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝĂĐƠƯẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼẾỀỂỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪỬỮỰỲÝỶỸỴ]/;
  const matches = (text.match(/[àáâãèéêìíòóôõùúýăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳýỷỹỵÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝĂĐƠƯẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼẾỀỂỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪỬỮỰỲÝỶỸỴ]/g) || []).length;
  // If >5% of characters are Vietnamese-specific diacritics, consider it Vietnamese
  return matches > 0 && (matches / text.replace(/\s/g, '').length) > 0.05;
}

function parseTranslation(data) {
  let text = '';
  if (Array.isArray(data)) {
    if (data[0] && typeof data[0].generated_text === 'string') {
      text = data[0].generated_text;
    }
  } else if (data) {
    if (typeof data.translation === 'string') {
      text = data.translation;
    } else if (typeof data.generated_text === 'string') {
      text = data.generated_text;
    } else if (Array.isArray(data.translation)) {
      if (data.translation[0] && typeof data.translation[0].generated_text === 'string') {
        text = data.translation[0].generated_text;
      }
    }
  }
  
  if (!text) return '';
  
  // Clean up <think> reasoning tags
  if (text.includes('<think>') && text.includes('</think>')) {
    text = text.replace(/<think>[\s\S]*?<\/think>/g, '');
  } else {
    text = text.replace(/<think>/g, '').replace(/<\/think>/g, '');
  }
  return text.trim();
}

async function onTranslateRequest(targetLang = 'auto', forcedText = '') {
  let text = forcedText;
  let context = '';
  let rect = null;
  
  if (!text) {
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
      const start = activeEl.selectionStart;
      const end = activeEl.selectionEnd;
      if (start !== end) {
        text = activeEl.value.substring(start, end).trim();
        context = activeEl.value.slice(0, 3000);
        rect = activeEl.getBoundingClientRect();
      }
    }
    
    if (!text && savedRange) {
      text = savedRange.toString().trim();
      context = savedRange.commonAncestorContainer.parentElement.innerText.slice(0, 2000);
      rect = savedRange.getBoundingClientRect();
    }
  } else {
    // If text was forced (e.g. from context menu), try to get the active selection range for visual positioning
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      rect = selection.getRangeAt(0).getBoundingClientRect();
    }
  }

  if (!text) return;
  currentSourceText = text;

  // Auto-detect Vietnamese: if 'auto' mode and text is Vietnamese, translate to English
  if (targetLang === 'auto' && isVietnamese(text)) {
    targetLang = 'english';
    console.log('[IT Translator] Vietnamese text detected — switching target to English.');
  }

  hideBtn();
  showBox(rect || { bottom: 200, left: 200, width: 100, top: 100 });

  // Update dynamic title of the overlay box
  const titleEl = overlayBox.querySelector('.it-title');
  if (titleEl) {
    if (targetLang === 'explain') {
      titleEl.textContent = 'Giải thích thuật ngữ IT';
    } else if (targetLang === 'summarize') {
      titleEl.textContent = 'Tóm tắt nội dung';
    } else if (targetLang === 'english') {
      titleEl.textContent = 'Dịch ngược (Vietnamese → English)';
    } else {
      titleEl.textContent = 'Dịch thuật ngữ (Translate)';
    }
  }

  console.log('── IT Translator Request ──');
  console.log('Source Text:', text);
  console.log('Context:', context);
  console.log('Target Lang:', targetLang);
  console.log('───────────────────────────');

  if (targetLang === 'auto' || targetLang === 'english' || targetLang === 'explain' || targetLang === 'summarize') {
    try {
      const authResult = await new Promise(resolve => {
        chrome.storage.local.get(['authSession', 'modelId', 'shareTranslation'], resolve);
      });
      const session = authResult.authSession;
      
      // Guest blocker: enforce login requirements
      if (!session || !session.uid) {
        showLoginRequiredPopup(rect);
        return;
      }

      const userId = session.uid;
      const modelId = authResult.modelId || 'qwen2';
      const shareTranslation = authResult.shareTranslation === true;

      const response = await fetch('https://hvmndoan-production.up.railway.app/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: text, 
          context: context, 
          target_lang: targetLang,
          glossary: {},
          glossary_mode: 'both',
          user_id: userId,
          model_id: modelId,
          share_translation: shareTranslation
        }),
      });
      if (response.ok) {
        const data = await response.json();
        stopProgressBar();
        const translationText = parseTranslation(data);
        boxBody.innerHTML = renderMarkdown(translationText);
      } else {
        stopProgressBar();
        boxBody.innerHTML = `<i style="color: #ff4a4a;">Lỗi ${targetLang === 'explain' ? 'giải thích thuật ngữ' : targetLang === 'summarize' ? 'tóm tắt' : 'dịch thuật'}.</i>`;
      }
    } catch (err) {
      stopProgressBar();
      boxBody.innerHTML = '<i style="color: #ff4a4a;">Không kết nối được server.</i>';
    }
    return;
  }
}

// ── Message Listener ──────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'GENERATE_PROGRESS') {
    console.log('[ContentScript] Received GENERATE_PROGRESS:', message.payload.partialText, 'done:', message.payload.done);
    if (overlayBox && overlayBox.style.display === 'flex') {
      const { partialText, done } = message.payload;
      stopProgressBar();
      
      console.log('[ContentScript] Updating boxBody.innerHTML to rendered markdown');
      boxBody.innerHTML = renderMarkdown(partialText);

      if (!done) {
        const cursor = document.createElement('span');
        cursor.className = 'it-cursor';
        boxBody.appendChild(cursor);
      }
    } else {
      console.warn('[ContentScript] Box not visible, ignoring progress');
    }
  }

  if (message.type === 'TRANSLATE_PAGE_CMD') {
    console.log('[IT Translator] Message TRANSLATE_PAGE_CMD received in content script.');
    translatePage();
  }

  if (message.type === 'TRIGGER_INLINE_TRANSLATION') {
    console.log('[IT Translator] Message TRIGGER_INLINE_TRANSLATION received.');
    triggerInlineTranslation();
  }

  if (message.type === 'TRIGGER_EXPLAIN_FROM_CONTEXT') {
    console.log('[ContentScript] Received TRIGGER_EXPLAIN_FROM_CONTEXT message for text:', message.text);
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      savedRange = selection.getRangeAt(0);
    }
    onTranslateRequest('explain', message.text);
  }

  if (message.type === 'TRIGGER_TRANSLATE_FROM_CONTEXT') {
    console.log('[ContentScript] Received TRIGGER_TRANSLATE_FROM_CONTEXT message for text:', message.text);
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      savedRange = selection.getRangeAt(0);
    }
    onTranslateRequest('auto', message.text);
  }
});

// ── Inline Translation & Replacement Helpers ─────────────────────────────────
async function triggerInlineTranslation() {
  const activeEl = document.activeElement;
  let text = '';
  let isInput = false;
  let start = 0;
  let end = 0;
  
  if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
    isInput = true;
    start = activeEl.selectionStart;
    end = activeEl.selectionEnd;
    if (start !== end) {
      text = activeEl.value.substring(start, end).trim();
    }
  } else {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      text = selection.toString().trim();
    }
  }
  
  if (!text) {
    showToast("Vui lòng bôi đen văn bản tiếng Việt cần dịch ngược.");
    return;
  }
  
  await performInlineReplace(text, activeEl, isInput, start, end);
}

async function performInlineReplace(text, activeEl, isInput, start, end) {
  if (isInput) {
    const value = activeEl.value;
    const loadingText = "...[Dịch: " + text.slice(0, 15) + "]...";
    activeEl.value = value.substring(0, start) + loadingText + value.substring(end);
    activeEl.selectionStart = start;
    activeEl.selectionEnd = start + loadingText.length;
    
    try {
      const glossaryResult = await new Promise(resolve => {
        chrome.storage.local.get(['glossary', 'glossaryEnabled', 'glossaryMode', 'authSession'], resolve);
      });
      const enabled = glossaryResult.glossaryEnabled !== false;
      const glossaryMode = glossaryResult.glossaryMode || 'both';
      const glossary = enabled ? (glossaryResult.glossary || []) : [];
      const glossaryDict = {};
      glossary.forEach(g => {
        if (g.term && g.meaning) glossaryDict[g.term] = g.meaning;
      });

      const session = glossaryResult.authSession;
      if (!session || !session.uid) {
        activeEl.value = value;
        showLoginRequiredPopup();
        return;
      }
      const userId = session.uid;

      const response = await fetch('https://hvmndoan-production.up.railway.app/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: text, 
          context: '', 
          target_lang: 'english',
          glossary: glossaryDict,
          glossary_mode: glossaryMode,
          user_id: userId
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        const translated = data.translation;
        
        const currentVal = activeEl.value;
        const currentLoadingStart = currentVal.indexOf(loadingText);
        if (currentLoadingStart !== -1) {
          activeEl.value = currentVal.substring(0, currentLoadingStart) + translated + currentVal.substring(currentLoadingStart + loadingText.length);
          activeEl.selectionStart = activeEl.selectionEnd = currentLoadingStart + translated.length;
        } else {
          activeEl.value = value.substring(0, start) + translated + value.substring(end);
          activeEl.selectionStart = activeEl.selectionEnd = start + translated.length;
        }
        activeEl.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        activeEl.value = value;
        showToast("Lỗi từ server dịch.");
      }
    } catch (err) {
      activeEl.value = value;
      showToast("Không kết nối được server.");
    }
  } else {
    // Contenteditable or standard page replacement (if editable)
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const parentEl = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;
    const isEditable = parentEl.closest('[contenteditable="true"]') !== null;
    
    if (!isEditable) {
      onTranslateRequest('english');
      return;
    }
    
    try {
      const authResult = await new Promise(resolve => {
        chrome.storage.local.get(['authSession'], resolve);
      });
      const session = authResult.authSession;
      if (!session || !session.uid) {
        showLoginRequiredPopup();
        return;
      }
      const userId = session.uid;

      const response = await fetch('https://hvmndoan-production.up.railway.app/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: text, 
          context: '', 
          target_lang: 'english',
          glossary: {},
          glossary_mode: 'both',
          user_id: userId
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        const translated = data.translation;
        range.deleteContents();
        const textNode = document.createTextNode(translated);
        range.insertNode(textNode);
        selection.removeAllRanges();
        const newRange = document.createRange();
        newRange.selectNodeContents(textNode);
        newRange.collapse(false);
        selection.addRange(newRange);
      }
    } catch (err) {
      showToast("Lỗi dịch ngược contenteditable.");
    }
  }
}

function showToast(message) {
  initShadowDOM();
  const toast = document.createElement('div');
  toast.className = 'it-toast';
  toast.textContent = message;
  shadowRoot.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

async function translatePage() {
  console.log('[IT Translator] Starting full page translation...');
  
  const textNodes = [];
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: function(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      
      const skipTags = ['SCRIPT', 'STYLE', 'CODE', 'PRE', 'NOSCRIPT', 'SVG', 'TEXTAREA'];
      if (skipTags.includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
      
      if (parent.closest('#it-translator-container')) return NodeFilter.FILTER_REJECT;
      
      const text = node.textContent.trim();
      if (text.length < 5) return NodeFilter.FILTER_REJECT;
      
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  let node;
  while (node = walk.nextNode()) {
    textNodes.push(node);
  }

  console.log(`[IT Translator] Found ${textNodes.length} nodes.`);

  if (textNodes.length === 0) {
    console.log('[IT Translator] No valid text nodes found (text length may be too short or tags skipped).');
    return;
  }

  // Đọc từ điển từ chrome.storage.local
  const glossaryResult = await new Promise(resolve => {
    chrome.storage.local.get(['glossary', 'glossaryEnabled', 'glossaryMode', 'authSession'], resolve);
  });
  
  const enabled = glossaryResult.glossaryEnabled !== false;
  const glossaryMode = glossaryResult.glossaryMode || 'both';
  const glossary = enabled ? (glossaryResult.glossary || []) : [];
  const glossaryDict = {};
  
  glossary.forEach(g => {
    if (g.term && g.meaning) {
      glossaryDict[g.term] = g.meaning;
    }
  });

  const session = glossaryResult.authSession;
  if (!session || !session.uid) {
    showLoginRequiredPopup();
    return;
  }
  const userId = session.uid;

  console.log(`[IT Translator] Translating page. Glossary: Enabled=${enabled}, Mode=${glossaryMode}, User=${userId}`);
  if (enabled && glossary.length > 0) {
    console.log(`[IT Translator] 📚 Từ điển hiện tại đang sử dụng:`, glossaryDict);
  }

  let successCount = 0;
  for (let i = 0; i < textNodes.length; i++) {
    const node = textNodes[i];
    const originalText = node.textContent.trim();
    console.log(`[IT Translator] Translating node ${i+1}/${textNodes.length}: "${originalText.slice(0, 30)}..."`);
    
    try {
      const response = await fetch('https://hvmndoan-production.up.railway.app/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: originalText, 
          context: '', 
          target_lang: 'auto',
          glossary: glossaryDict,
          glossary_mode: glossaryMode,
          user_id: userId
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`[IT Translator] Success node ${i+1}`);
        node.textContent = node.textContent.replace(originalText, data.translation);
        successCount++;
      } else {
        console.error(`[IT Translator] API Error node ${i+1}: Status ${response.status}`);
      }
    } catch (err) {
      console.error(`[IT Translator] Fetch Error node ${i+1}:`, err);
    }
  }
  
  console.log(`[IT Translator] Page translation complete. Success: ${successCount}/${textNodes.length}`);
}

// ── Selection Detection ───────────────────────────────────────────────────────
document.addEventListener('mouseup', (e) => {
  // Ignore if clicking inside our container
  if (document.getElementById(CONTAINER_ID)?.contains(e.target)) return;

  setTimeout(() => {
    // Check if bôi đen inside an input or textarea
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
      const start = activeEl.selectionStart;
      const end = activeEl.selectionEnd;
      if (start !== end && (end - start) > 1) {
        const text = activeEl.value.substring(start, end).trim();
        if (text.length > 1) {
          const rect = activeEl.getBoundingClientRect();
          initShadowDOM();
          floatBtn.style.top = `${window.scrollY + rect.top - 45}px`;
          floatBtn.style.left = `${window.scrollX + rect.left + rect.width / 2 - 200}px`;
          floatBtn.style.display = 'flex';
          savedRange = null; // Mark that it is an input selection
          return;
        }
      }
    }

    // Normal webpage text selection
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

// ── Double Click to Explain Technical Term ──────────────────────────────────
document.addEventListener('dblclick', (e) => {
  if (document.getElementById(CONTAINER_ID)?.contains(e.target)) return;

  setTimeout(() => {
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) {
      const text = selection.toString().trim();
      // Check if it looks like a technical word (single word, between 2 and 30 characters)
      if (text.length >= 2 && text.length <= 30 && !text.includes(' ') && !text.includes('\n')) {
        showBtn(selection.getRangeAt(0));
        // Highlight the Explain button by making it primary!
        initShadowDOM();
        const btns = floatBtn.querySelectorAll('.it-btn-item');
        btns.forEach(btn => {
          if (btn.innerHTML.includes('Giải thích')) {
            btn.className = 'it-btn-item primary';
          } else {
            btn.className = 'it-btn-item';
          }
        });
      }
    }
  }, 60);
});

// ── Auto Web Translation Startup Check ───────────────────────────────────────
if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
  chrome.storage.local.get(['autoTranslateUrl'], (result) => {
    if (result.autoTranslateUrl) {
      const currentUrl = window.location.href.toLowerCase();
      const targetUrl = result.autoTranslateUrl.toLowerCase();
      
      // Clean URLs to compare domains and paths reliably
      const cleanCurrent = currentUrl.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
      const cleanTarget = targetUrl.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
      
      if (cleanCurrent.startsWith(cleanTarget) || cleanTarget.startsWith(cleanCurrent)) {
        console.log('[IT Translator] Matches autoTranslateUrl, triggering full page translation...');
        chrome.storage.local.remove(['autoTranslateUrl']);
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
          setTimeout(translatePage, 1000);
        } else {
          window.addEventListener('load', () => setTimeout(translatePage, 1000));
        }
      }
    }
  });
}

console.log('[IT Translator] Shadow DOM Content Script Ready.');
