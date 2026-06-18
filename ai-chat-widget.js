/* ============================================================
   AI Chat Widget — Road to II kat. theme
   v3 — streaming + visualizations
   ============================================================ */
(function () {

  // ── CONFIG ────────────────────────────────────────────────
  const TUNNEL_URL  = "https://men-platform-carb-greene.trycloudflare.com";
  const MODEL       = "qwen/qwen3.5-9b";
  const API_KEY     = "sk-lm-mckv4g0w:zoEdEPITwMXsvJQVpUZZ";
  const REASONING   = "on";
  const CONTEXT_LEN = 24000;
  const MCP_PLUGIN  = "mcp/serper-search";


  
  const SYSTEM_PROMPT = `You are a helpful AI assistant with web search capability.

When asked to create any chart, graph, plot, or data visualization, respond with a COMPLETE self-contained HTML code block (\`\`\`html) using Chart.js from CDN:
<!DOCTYPE html><html>
<head><script src="https://cdn.jsdelivr.net/npm/chart.js"><\/script></head>
<body style="margin:0;padding:16px;background:#0d0d0d;display:flex;justify-content:center;align-items:center;min-height:100vh">
<canvas id="c" style="max-width:100%;max-height:320px"></canvas>
<script>new Chart(document.getElementById('c'),{ /* config */ });<\/script>
</body></html>
Use dark backgrounds (#0d0d0d) and gold accents (#d4a017).
When asked to draw a diagram or flowchart, respond with an SVG code block (\`\`\`svg).
Keep all visualization code fully self-contained.`;
  // ─────────────────────────────────────────────────────────

  /* ── CSS ─────────────────────────────────────────────────── */
  const CSS = `
    #aicw-wrap *{box-sizing:border-box;margin:0;padding:0}
    #aicw-bubble{position:fixed;bottom:24px;right:24px;z-index:99999;width:54px;height:54px;border-radius:50%;background:#d4a017;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 24px rgba(212,160,23,.4);font-size:22px;color:#0d0d0d;transition:transform .15s,box-shadow .15s}
    #aicw-bubble:hover{transform:scale(1.08);box-shadow:0 6px 32px rgba(212,160,23,.5)}
    #aicw-panel{position:fixed;bottom:90px;right:24px;z-index:99999;width:460px;height:640px;max-height:84vh;background:#0d0d0d;border:1px solid rgba(255,255,255,.12);border-radius:16px;display:none;flex-direction:column;box-shadow:0 12px 60px rgba(0,0,0,.9);overflow:hidden;font-family:'Segoe UI',system-ui,sans-serif;font-size:14px}
    #aicw-panel.open{display:flex}
    #aicw-hdr{display:flex;align-items:center;gap:10px;padding:13px 16px;border-bottom:1px solid rgba(255,255,255,.07);background:#161616;flex-shrink:0}
    .aicw-hdr-title{font-size:14px;font-weight:600;color:#f0f0f0}
    .aicw-hdr-sub{font-size:11px;color:#555;margin-top:1px}
    .aicw-hdr-btns{display:flex;gap:2px;margin-left:auto}
    .aicw-hbtn{background:none;border:none;cursor:pointer;color:#555;font-size:17px;padding:4px 7px;border-radius:6px;line-height:1;transition:color .15s,background .15s}
    .aicw-hbtn:hover{color:#f0f0f0;background:rgba(255,255,255,.06)}
    #aicw-settings{padding:12px 16px;border-bottom:1px solid rgba(255,255,255,.07);background:#1c1c1c;flex-shrink:0;display:none}
    #aicw-settings.open{display:block}
    .aicw-slabel{font-size:11px;color:#555;margin-bottom:4px;margin-top:10px}
    .aicw-slabel:first-child{margin-top:0}
    .aicw-sinput{width:100%;background:#1f1f1f;border:1px solid rgba(255,255,255,.07);border-radius:7px;padding:7px 10px;color:#f0f0f0;font-size:12px;outline:none;font-family:monospace;transition:border .15s}
    .aicw-sinput:focus{border-color:rgba(212,160,23,.4)}
    #aicw-msgs{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:4px;scrollbar-width:thin;scrollbar-color:#333 transparent}
    #aicw-msgs::-webkit-scrollbar{width:4px}
    #aicw-msgs::-webkit-scrollbar-thumb{background:#333;border-radius:2px}
    #aicw-empty{text-align:center;margin:auto;padding:40px 20px}
    #aicw-empty .ei{font-size:36px;margin-bottom:12px}
    #aicw-empty .et{font-size:14px;color:#555}
    #aicw-empty .es{font-size:12px;color:#3a3a3a;margin-top:6px}
    .aicw-umsg{display:flex;justify-content:flex-end;margin-bottom:14px}
    .aicw-ububble{max-width:82%;background:rgba(212,160,23,.1);border:1px solid rgba(212,160,23,.2);border-radius:14px 14px 4px 14px;padding:10px 14px;color:#f0f0f0;font-size:14px;line-height:1.6;white-space:pre-wrap;word-break:break-word}
    .aicw-uimgs{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;margin-bottom:6px}
    .aicw-uimg{width:72px;height:72px;object-fit:cover;border-radius:8px;border:1px solid rgba(255,255,255,.1)}
    .aicw-bmsg{margin-bottom:16px}
    /* Thinking */
    .aicw-think{background:#13100a;border:1px solid rgba(180,130,20,.25);border-radius:10px;margin-bottom:8px;overflow:hidden}
    .aicw-think-hdr-static{display:flex;align-items:center;gap:7px;padding:9px 12px}
    .aicw-think-hdr-btn{display:flex;align-items:center;gap:7px;padding:9px 12px;cursor:pointer;user-select:none;background:none;border:none;width:100%;text-align:left}
    .aicw-caret{font-size:11px;color:#6e5520;transition:transform .2s;display:inline-block;line-height:1}
    .aicw-caret.closed{transform:rotate(-90deg)}
    .aicw-think-label{font-size:12px;color:#b8944a;font-weight:500}
    .aicw-think-badge{font-size:10px;color:#6e5520;margin-left:auto;background:rgba(180,130,20,.1);border:1px solid rgba(180,130,20,.15);border-radius:4px;padding:1px 7px}
    .aicw-think-body{padding:0 12px 12px;font-size:12px;color:#b8944a;line-height:1.7;font-family:monospace;white-space:pre-wrap;word-break:break-word;max-height:300px;overflow-y:auto;opacity:.85}
    /* Thinking stream dots */
    .aicw-think-dots span{display:inline-block;width:5px;height:5px;border-radius:50%;background:#b8944a;margin-right:3px;animation:aicw-pulse 1.2s infinite}
    .aicw-think-dots span:nth-child(2){animation-delay:.2s}
    .aicw-think-dots span:nth-child(3){animation-delay:.4s}
    @keyframes aicw-pulse{0%,80%,100%{opacity:.15}40%{opacity:1}}
    /* Tool */
    .aicw-tool{background:#0b1520;border:1px solid rgba(60,120,200,.25);border-radius:10px;margin-bottom:8px;overflow:hidden}
    .aicw-tool-hdr{display:flex;align-items:center;gap:8px;padding:9px 12px;cursor:pointer;user-select:none;background:none;border:none;width:100%;text-align:left}
    .aicw-tool-icon{font-size:13px;color:#5ba0dc}
    .aicw-tool-name{font-size:13px;font-family:monospace;color:#5ba0dc;font-weight:500}
    .aicw-tool-provider{font-size:10px;color:rgba(91,160,220,.7);background:rgba(91,160,220,.08);border:1px solid rgba(91,160,220,.15);border-radius:4px;padding:1px 7px}
    .aicw-tool-caret{font-size:11px;color:#2a4060;margin-left:auto;transition:transform .2s;display:inline-block}
    .aicw-tool-caret.closed{transform:rotate(-90deg)}
    .aicw-tool-body{padding:0 12px 12px}
    .aicw-tlabel{font-size:10px;color:#555;text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px}
    .aicw-tpre{background:#060e18;border:1px solid rgba(60,120,200,.25);border-radius:6px;padding:8px 10px;font-size:11px;color:#8ab8dc;overflow-x:auto;margin:0 0 10px;font-family:monospace;white-space:pre-wrap;word-break:break-word;max-height:180px;overflow-y:auto;line-height:1.5}
    .aicw-text{font-size:14px;color:#f0f0f0;line-height:1.7;word-break:break-word}
    .aicw-text-live{font-size:14px;color:#f0f0f0;line-height:1.7;white-space:pre-wrap;word-break:break-word}
    .aicw-text code{background:#1c1c1c;border:1px solid rgba(255,255,255,.1);border-radius:4px;padding:1px 5px;font-family:monospace;font-size:12px;color:#c8b870}
    .aicw-codeblock{background:#060a0f;border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:10px 13px;font-size:12px;font-family:monospace;color:#a0c8e0;overflow-x:auto;margin:8px 0;white-space:pre;line-height:1.5}
    .aicw-stats{margin-top:7px;font-size:11px;color:#3a3a3a;display:flex;gap:12px}
    .aicw-err{background:#140808;border:1px solid rgba(200,60,60,.25);border-radius:10px;padding:10px 14px;font-size:13px;color:#dc6060;margin-bottom:8px}
    /* Viz */
    .aicw-viz{border-radius:10px;margin:10px 0;overflow:hidden;border:1px solid rgba(255,255,255,.12)}
    .aicw-viz-bar{display:flex;align-items:center;justify-content:space-between;padding:6px 10px;background:#111;border-bottom:1px solid rgba(255,255,255,.07)}
    .aicw-viz-label{font-size:11px;color:#555;display:flex;align-items:center;gap:6px}
    .aicw-viz-label span{color:#d4a017}
    .aicw-viz-toggle{font-size:11px;color:#555;background:none;border:1px solid rgba(255,255,255,.1);border-radius:5px;padding:2px 8px;cursor:pointer;transition:color .15s,border .15s}
    .aicw-viz-toggle:hover{color:#f0f0f0;border-color:rgba(255,255,255,.25)}
    .aicw-viz-frame{width:100%;border:none;min-height:240px;display:block;background:#0d0d0d}
    .aicw-viz-svg{padding:12px;background:#0a0a12;overflow:auto;display:flex;justify-content:center}
    .aicw-viz-svg svg{max-width:100%;height:auto}
    .aicw-viz-src{background:#060a0f;padding:10px 13px;font-size:11px;font-family:monospace;color:#a0c8e0;white-space:pre;overflow-x:auto;line-height:1.5;max-height:240px;overflow-y:auto;display:none}
    .aicw-viz-src.show{display:block}
    /* Previews */
    #aicw-previews{padding:8px 12px 0;display:none;gap:7px;flex-wrap:wrap;border-top:1px solid rgba(255,255,255,.07);flex-shrink:0}
    #aicw-previews.show{display:flex}
    .aicw-pw{position:relative}
    .aicw-pi{width:56px;height:56px;object-fit:cover;border-radius:7px;border:1px solid rgba(255,255,255,.1)}
    .aicw-prm{position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:50%;background:#2a2a2a;border:1px solid rgba(255,255,255,.15);color:#888;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1}
    .aicw-prm:hover{background:#3a3a3a;color:#f0f0f0}
    /* Input */
    #aicw-inrow{padding:10px 12px;border-top:1px solid rgba(255,255,255,.07);display:flex;gap:8px;align-items:flex-end;flex-shrink:0;background:#161616}
    .aicw-ibtn{background:none;border:1px solid rgba(255,255,255,.1);border-radius:8px;width:36px;height:36px;cursor:pointer;color:#555;font-size:15px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:border .15s,color .15s}
    .aicw-ibtn:hover{border-color:rgba(255,255,255,.2);color:#f0f0f0}
    #aicw-ta{flex:1;background:#1f1f1f;border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:9px 12px;color:#f0f0f0;font-size:14px;outline:none;resize:none;font-family:inherit;line-height:1.5;max-height:120px;overflow-y:auto;transition:border .15s;min-height:38px}
    #aicw-ta:focus{border-color:rgba(212,160,23,.35)}
    #aicw-ta::placeholder{color:#3a3a3a}
    #aicw-send{background:#d4a017;border:none;border-radius:8px;width:36px;height:36px;cursor:pointer;color:#0d0d0d;font-size:17px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-weight:700;transition:opacity .15s,transform .15s}
    #aicw-send:hover{opacity:.85}
    #aicw-send:active{transform:scale(.95)}
    #aicw-send:disabled{opacity:.3;cursor:not-allowed}
  `;

  /* ── DOM ─────────────────────────────────────────────────── */
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  document.head.appendChild(styleEl);

  const root = document.getElementById('ai-chat') || document.body;
  root.insertAdjacentHTML('beforeend', `
    <div id="aicw-wrap">
      <div id="aicw-panel">
        <div id="aicw-hdr">
          <span style="font-size:20px">♟</span>
          <div>
            <div class="aicw-hdr-title">AI Assistant</div>
            <div class="aicw-hdr-sub" id="aicw-modelsub">${MODEL.split('/').pop()} · local</div>
          </div>
          <div class="aicw-hdr-btns">
            <button class="aicw-hbtn" id="aicw-resetbtn" title="New conversation">↺</button>
            <button class="aicw-hbtn" id="aicw-settingsbtn" title="Settings">⚙</button>
            <button class="aicw-hbtn" id="aicw-closebtn">✕</button>
          </div>
        </div>
        <div id="aicw-settings">
          <div class="aicw-slabel">Tunnel URL</div>
          <input class="aicw-sinput" id="aicw-surl" type="text" value="${TUNNEL_URL}">
          <div class="aicw-slabel">Model</div>
          <input class="aicw-sinput" id="aicw-smodel" type="text" value="${MODEL}">
          <div class="aicw-slabel">API Key</div>
          <input class="aicw-sinput" id="aicw-sapikey" type="password" value="${API_KEY}">
          <div class="aicw-slabel">Reasoning</div>
          <select class="aicw-sinput" id="aicw-sreasoning" style="cursor:pointer">
            <option value="on" selected>on</option>
            <option value="off">off</option>
          </select>
        </div>
        <div id="aicw-msgs">
          <div id="aicw-empty">
            <div class="ei">♟</div>
            <div class="et">Ask anything</div>
            <div class="es">Reasoning · Web search · Visualizations</div>
          </div>
        </div>
        <div id="aicw-previews"></div>
        <div id="aicw-inrow">
          <input type="file" id="aicw-filein" accept="image/*" multiple style="display:none">
          <button class="aicw-ibtn" id="aicw-attachbtn" title="Attach image">🖼</button>
          <textarea id="aicw-ta" rows="1" placeholder="Ask anything… paste images, ask to visualize data"></textarea>
          <button id="aicw-send">↑</button>
        </div>
      </div>
      <button id="aicw-bubble">♟</button>
    </div>
  `);

  /* ── STATE ───────────────────────────────────────────────── */
  let panelOpen = false, settingsOpen = false, loading = false;
  let prevResponseId = null, attachedImgs = [], msgIdx = 0;
  const conversation = [];
  const collapsed = {};
  

  const panel    = document.getElementById('aicw-panel');
  const bubble   = document.getElementById('aicw-bubble');
  const msgs     = document.getElementById('aicw-msgs');
  const ta       = document.getElementById('aicw-ta');
  const sendBtn  = document.getElementById('aicw-send');
  const previews = document.getElementById('aicw-previews');

  const cfg = () => ({
    url:       document.getElementById('aicw-surl').value.trim().replace(/\/+$/, ''),
    model:     document.getElementById('aicw-smodel').value.trim(),
    apiKey:    document.getElementById('aicw-sapikey').value.trim(),
    reasoning: document.getElementById('aicw-sreasoning').value,
  });

  /* ── CONTROLS ────────────────────────────────────────────── */
  bubble.onclick = () => {
    panelOpen = !panelOpen;
    panel.classList.toggle('open', panelOpen);
    bubble.textContent = panelOpen ? '✕' : '♟';
  };
  document.getElementById('aicw-closebtn').onclick = () => {
    panelOpen = false; panel.classList.remove('open'); bubble.textContent = '♟';
  };
  document.getElementById('aicw-settingsbtn').onclick = () => {
    settingsOpen = !settingsOpen;
    document.getElementById('aicw-settings').classList.toggle('open', settingsOpen);
  };
  document.getElementById('aicw-smodel').oninput = e => {
    document.getElementById('aicw-modelsub').textContent = e.target.value.split('/').pop() + ' · local';
  };
  document.getElementById('aicw-resetbtn').onclick = () => {
    if (!confirm('Start a new conversation?')) return;
    conversation.length = 0;
    prevResponseId = null; attachedImgs = []; msgIdx = 0;
    msgs.innerHTML = `<div id="aicw-empty"><div class="ei">♟</div><div class="et">Ask anything</div><div class="es">Reasoning · Web search · Visualizations</div></div>`;
    updatePreviews();
  };

  /* ── IMAGE HANDLING ──────────────────────────────────────── */
  document.getElementById('aicw-attachbtn').onclick = () => document.getElementById('aicw-filein').click();
  document.getElementById('aicw-filein').onchange = e => { for (const f of e.target.files) readFile(f); e.target.value = ''; };

  function readFile(file) {
    if (!file.type.startsWith('image/')) return;
    const r = new FileReader();
    r.onload = e => { attachedImgs.push({ name: file.name, url: e.target.result }); updatePreviews(); };
    r.readAsDataURL(file);
  }
  function updatePreviews() {
    if (!attachedImgs.length) { previews.classList.remove('show'); previews.innerHTML = ''; return; }
    previews.classList.add('show');
    previews.innerHTML = attachedImgs.map((img, i) =>
      `<div class="aicw-pw"><img class="aicw-pi" src="${img.url}"><button class="aicw-prm" onclick="window.__aicwRmImg(${i})">✕</button></div>`
    ).join('');
  }
  window.__aicwRmImg = i => { attachedImgs.splice(i, 1); updatePreviews(); };

  /* ── TEXTAREA ────────────────────────────────────────────── */
  ta.addEventListener('paste', e => {
    for (const item of e.clipboardData.items)
      if (item.type.startsWith('image/')) readFile(item.getAsFile());
  });
  ta.addEventListener('input', () => {
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  });
  ta.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); }
  });
  sendBtn.onclick = sendMsg;

  /* ── COLLAPSE ────────────────────────────────────────────── */
  window.__aicwToggle = key => {
    collapsed[key] = !collapsed[key];
    document.querySelectorAll(`[data-aicw-caret="${key}"]`).forEach(el => el.classList.toggle('closed', !!collapsed[key]));
    document.querySelectorAll(`[data-aicw-body="${key}"]`).forEach(el => el.style.display = collapsed[key] ? 'none' : '');
  };
  window.__aicwVizToggle = id => {
    const src = document.getElementById(`aicw-vsrc-${id}`);
    const btn = document.getElementById(`aicw-vtog-${id}`);
    if (!src || !btn) return;
    const show = src.classList.toggle('show');
    btn.textContent = show ? 'Hide code' : 'View code';
  };

  /* ── HELPERS ─────────────────────────────────────────────── */
  function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  const b64enc = str => btoa(unescape(encodeURIComponent(str)));
  const b64dec = b64 => decodeURIComponent(escape(atob(b64)));
  function scrollBottom() { msgs.scrollTop = msgs.scrollHeight; }

  /* ── MARKDOWN + VIZ RENDERER ─────────────────────────────── */
  function renderMd(text, idx) {
    const blocks = [];
    const stripped = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
      const i = blocks.length;
      blocks.push({ lang: lang.toLowerCase().trim(), code: code.trim() });
      return `\x00BLK${i}\x00`;
    });

    let html = esc(stripped);

    html = html.replace(/\x00BLK(\d+)\x00/g, (_, i) => {
      const { lang, code } = blocks[i];
      const vizId = `v${idx}-${i}`;

      if (lang === 'html') {
        return `<div class="aicw-viz">
          <div class="aicw-viz-bar">
            <span class="aicw-viz-label"><span>▊</span> HTML visualization</span>
            <button class="aicw-viz-toggle" id="aicw-vtog-${vizId}" onclick="__aicwVizToggle('${vizId}')">View code</button>
          </div>
          <div id="aicw-vframe-${vizId}" data-src="${b64enc(code)}"></div>
          <div class="aicw-viz-src" id="aicw-vsrc-${vizId}">${esc(code)}</div>
        </div>`;
      }
      if (lang === 'svg') {
        return `<div class="aicw-viz">
          <div class="aicw-viz-bar">
            <span class="aicw-viz-label"><span>▲</span> SVG diagram</span>
            <button class="aicw-viz-toggle" id="aicw-vtog-${vizId}" onclick="__aicwVizToggle('${vizId}')">View code</button>
          </div>
          <div class="aicw-viz-svg" id="aicw-vsvg-${vizId}" data-src="${b64enc(code)}"></div>
          <div class="aicw-viz-src" id="aicw-vsrc-${vizId}">${esc(code)}</div>
        </div>`;
      }
      return `<div class="aicw-codeblock">${esc(code)}</div>`;
    });

    html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    html = html.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
    html = html.replace(/\n/g, '<br>');
    return html;
  }

  function activateVizBlocks(container) {
    container.querySelectorAll('[id^="aicw-vframe-"]').forEach(el => {
      const encoded = el.dataset.src;
      if (!encoded) return;
      try {
        const iframe = document.createElement('iframe');
        iframe.className = 'aicw-viz-frame';
        iframe.sandbox = 'allow-scripts';
        iframe.srcdoc = b64dec(encoded);
        iframe.style.height = '280px';
        iframe.onload = () => {
          try {
            const h = iframe.contentDocument?.documentElement?.scrollHeight;
            if (h > 50) iframe.style.height = Math.min(h + 16, 420) + 'px';
          } catch(e) {}
        };
        el.replaceWith(iframe);
      } catch(e) {}
    });
    container.querySelectorAll('[id^="aicw-vsvg-"]').forEach(el => {
      const encoded = el.dataset.src;
      if (!encoded) return;
      try {
        el.innerHTML = b64dec(encoded);
        const svg = el.querySelector('svg');
        if (svg) {
          if (!svg.getAttribute('viewBox') && svg.getAttribute('width') && svg.getAttribute('height')) {
            svg.setAttribute('viewBox', `0 0 ${svg.getAttribute('width')} ${svg.getAttribute('height')}`);
          }
          svg.removeAttribute('width'); svg.setAttribute('width', '100%');
        }
      } catch(e) {}
    });
  }

  /* ── USER MESSAGE ────────────────────────────────────────── */
  function addUserMsg(text, imgs) {
    const empty = document.getElementById('aicw-empty');
    if (empty) empty.remove();
    const div = document.createElement('div');
    div.className = 'aicw-umsg';
    const imgHtml = imgs.length ? `<div class="aicw-uimgs">${imgs.map(i => `<img class="aicw-uimg" src="${i.url}">`).join('')}</div>` : '';
    const textHtml = text ? `<div class="aicw-ububble">${esc(text)}</div>` : '';
    div.innerHTML = `<div style="max-width:82%">${imgHtml}${textHtml}</div>`;
    msgs.appendChild(div);
    scrollBottom();
  }

  /* ── STREAMING BOT MESSAGE ───────────────────────────────── */
  function createBotMessage() {
    const idx = msgIdx++;
    const botDiv = document.createElement('div');
    botDiv.className = 'aicw-bmsg';

    // --- Thinking block (hidden until first reasoning chunk) ---
    const thinkWrap = document.createElement('div');
    thinkWrap.className = 'aicw-think';
    thinkWrap.style.display = 'none';

    // Static header during streaming
    const thinkHdrStatic = document.createElement('div');
    thinkHdrStatic.className = 'aicw-think-hdr-static';
    thinkHdrStatic.innerHTML = `<div class="aicw-think-dots"><span></span><span></span><span></span></div><span class="aicw-think-label">Thinking</span>`;

    const thinkBody = document.createElement('div');
    thinkBody.className = 'aicw-think-body';

    thinkWrap.append(thinkHdrStatic, thinkBody);

    // --- Tool calls container ---
    const toolsDiv = document.createElement('div');

    // --- Live text (pre-rendered during stream, raw text) ---
    const textLive = document.createElement('div');
    textLive.className = 'aicw-text-live';

    // --- Final rendered text (shown after stream done) ---
    const textFinal = document.createElement('div');
    textFinal.className = 'aicw-text';
    textFinal.style.display = 'none';

    // --- Stats ---
    const statsDiv = document.createElement('div');
    statsDiv.className = 'aicw-stats';

    botDiv.append(thinkWrap, toolsDiv, textLive, textFinal, statsDiv);
    msgs.appendChild(botDiv);

    const startTime = Date.now();
    let thinkShown = false;
    let thinkDone  = false;

    return {
      idx,
      botDiv, thinkWrap, thinkHdrStatic, thinkBody,
      toolsDiv, textLive, textFinal, statsDiv,
      startTime,
      thinkShown, thinkDone,

      // Called as reasoning text streams in
      appendThinking(chunk) {
        if (!this.thinkShown) {
          thinkWrap.style.display = '';
          this.thinkShown = true;
        }
        thinkBody.textContent += chunk;
        scrollBottom();
      },

      // Called when message text starts (reasoning done)
      sealThinking() {
        if (this.thinkDone) return;
        this.thinkDone = true;
        const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(2);
        // Swap static header for collapsible button
        const key = `think-${this.idx}`;
        const btn = document.createElement('button');
        btn.className = 'aicw-think-hdr-btn';
        btn.onclick = () => window.__aicwToggle(key);
        btn.innerHTML = `<span class="aicw-caret" data-aicw-caret="${key}">▾</span>
          <span class="aicw-think-label">Thought for ${elapsed}s</span>`;
        thinkBody.setAttribute('data-aicw-body', key);
        thinkHdrStatic.replaceWith(btn);
      },

      // Called as message text streams in
      appendText(chunk) {
        this.sealThinking();
        textLive.textContent += chunk;
        scrollBottom();
      },

      // Called when a complete tool_call item arrives
      addToolCall(tc) {
    const key = `tool-${this.idx}-${tc.id}`;

    const provider =
        tc.provider_info?.plugin_id ||
        tc.provider_info?.server_label ||
        '';

    const provBadge = provider
        ? `<span class="aicw-tool-provider">${esc(provider)}</span>`
        : '';

    const argsStr =
        JSON.stringify(tc.arguments ?? {}, null, 2);

    const resultStr =
        typeof tc.output === 'string'
            ? tc.output
            : JSON.stringify(tc.output ?? '', null, 2);

    const div = document.createElement('div');

    div.className = 'aicw-tool';
    div.dataset.toolId = tc.id;

    div.innerHTML = `
        <button class="aicw-tool-hdr"
                onclick="__aicwToggle('${key}')">
            <span class="aicw-tool-icon">⚙</span>
            <span class="aicw-tool-name">
                ${esc(tc.tool || 'Tool')}
            </span>
            ${provBadge}
            <span class="aicw-tool-caret"
                  data-aicw-caret="${key}">
                ▾
            </span>
        </button>

        <div class="aicw-tool-body"
             data-aicw-body="${key}">
            <div class="aicw-tlabel">Arguments</div>

            <pre class="aicw-tpre aicw-tool-args">
${esc(argsStr)}
            </pre>

            <div class="aicw-tlabel">Result</div>

            <pre class="aicw-tpre aicw-tool-result"></pre>
        </div>
    `;

    toolsDiv.appendChild(div);

    scrollBottom();
},
updateToolCall(tc) {

    const div =
        this.toolsDiv?.querySelector(
            `[data-tool-id="${tc.id}"]`
        ) ||
        toolsDiv.querySelector(
            `[data-tool-id="${tc.id}"]`
        );

    if (!div) return;

    div.querySelector('.aicw-tool-name')
        .textContent =
            tc.tool || 'Tool';

    const args =
        div.querySelector('.aicw-tool-args');

    if (args) {
        args.textContent =
            JSON.stringify(
                tc.arguments ?? {},
                null,
                2
            );
    }

    const result =
        div.querySelector('.aicw-tool-result');

    if (result) {
        result.textContent =
            typeof tc.output === 'string'
                ? tc.output
                : JSON.stringify(
                    tc.output ?? '',
                    null,
                    2
                );
    }
},
      // Called when stream is fully done
      finalize(fullMessage, toolCalls, stats, responseId) {
        this.sealThinking();

        // Render tool calls (if they arrived as complete items in the done event)
        for (const tc of toolCalls) {

    const existing =
        toolsDiv.querySelector(
            `[data-tool-id="${tc.id}"]`
        );

    if (!existing)
        this.addToolCall(tc);
}

        // Final markdown render (replaces live raw text)
        textLive.style.display = 'none';
        textFinal.style.display = '';
        if (fullMessage) {
          textFinal.innerHTML = renderMd(fullMessage, this.idx);
          activateVizBlocks(textFinal);
        } else if (!thinkBody.textContent && !toolsDiv.children.length) {
          textFinal.innerHTML = `<div class="aicw-err">No response. Is LM Studio running?</div>`;
          textFinal.style.display = '';
        }

        // Stats
        if (stats) {
          const toks = stats.total_output_tokens || 0;
          const tps  = stats.tokens_per_second > 0 ? ` · ${stats.tokens_per_second.toFixed(1)} tok/s` : '';
          if (toks) statsDiv.textContent = `${toks} tokens${tps}`;
        }

        if (responseId) prevResponseId = responseId;
        scrollBottom();
      }
    };
  }

  /* ── SSE EVENT PROCESSOR ─────────────────────────────────── */
  // Handles multiple possible streaming formats from LM Studio
  function processSSEEvent(event, ui, state) {
  console.log(event.type, event);

  if (!event || typeof event !== "object") return;

  // -----------------------------
  // LM Studio Chat API
  // -----------------------------

  if (event.type === "message.delta") {
    const chunk = event.content || "";

    state.message += chunk;
    ui.appendText(chunk);
    return;
  }

  if (
    event.type === "reasoning.delta" ||
    event.type === "thinking.delta"
  ) {
    const chunk =
      event.content ||
      event.delta?.text ||
      event.delta?.thinking ||
      "";

    if (!chunk) return;

    state.reasoning += chunk;
    ui.appendThinking(chunk);
    return;
  }

  // -----------------------------
  // Tool Calls
  // -----------------------------

  // -----------------------------
// LM Studio Tool Calls
// -----------------------------

if (event.type === "tool_call.start") {

  state.currentTool = {
    id: crypto.randomUUID(),
    tool: "",
    arguments: {},
    output: ""
};

  state.toolCalls.push(state.currentTool);

  if (ui.addToolCall)

  return;
}

if (event.type === "tool_call.name") {

    state.currentTool.tool = event.tool_name;

    const exists =
        ui.toolsDiv.querySelector(
            `[data-tool-id="${state.currentTool.id}"]`
        );

    if (!exists)
        ui.addToolCall(state.currentTool);

    return;
}

if (event.type === "tool_call.arguments") {

  const tool = state.currentTool;
  if (!tool) return;

  tool.arguments = event.arguments || {};

    ui.updateToolCall(tool);

  return;
}

if (event.type === "tool_call.success") {

  const tool = state.currentTool;
  if (!tool) return;

  tool.status = "success";
  tool.output = event.output;

    ui.updateToolCall(tool);

  return;
}

if (event.type === "tool_call.error") {

  const tool = state.currentTool;
  if (!tool) return;

  tool.status = "error";
  tool.error = event.error;

  if (ui.updateToolCall)
    ui.updateToolCall(tool);

  return;
}
  

  // -----------------------------
  // Anthropic blocks
  // -----------------------------

  if (
    event.type === "content_start" ||
    event.type === "content_block_start"
  ) {
    state.currentBlockIdx = event.index ?? 0;

    state.blocks[state.currentBlockIdx] = {
      type:
        event.item?.type ||
        event.content_block?.type ||
        "",
      text:
        event.item?.content ||
        event.content_block?.content ||
        event.content_block?.thinking ||
        ""
    };

    return;
  }

  if (
    event.type === "content_delta" ||
    event.type === "content_block_delta"
  ) {
    const idx =
      event.index ?? state.currentBlockIdx;

    const block = state.blocks[idx];

    if (!block) return;

    const chunk =
      event.delta?.text ??
      event.delta?.thinking ??
      event.delta?.content ??
      "";

    if (!chunk) return;

    block.text += chunk;

    if (
      block.type === "reasoning" ||
      block.type === "thinking"
    ) {
      state.reasoning += chunk;
      ui.appendThinking(chunk);
    } else {
      state.message += chunk;
      ui.appendText(chunk);
    }

    return;
  }

  // -----------------------------
  // Responses API
  // -----------------------------

  if (event.type === "response.output_text.delta") {
    const chunk =
      typeof event.delta === "string"
        ? event.delta
        : event.delta?.text || "";

    state.message += chunk;
    ui.appendText(chunk);

    return;
  }

  if (event.type === "response.reasoning.delta") {
    const chunk =
      typeof event.delta === "string"
        ? event.delta
        : event.delta?.text || "";

    state.reasoning += chunk;
    ui.appendThinking(chunk);

    return;
  }

  if (
    event.type === "response.function_call_arguments.delta"
  ) {
    let tool =
      state.toolCalls[state.toolCalls.length - 1];

    if (!tool) {
      tool = {
        id: Date.now(),
        name: "function",
        arguments: ""
      };

      state.toolCalls.push(tool);
    }

    tool.arguments +=
      event.delta ||
      event.arguments ||
      "";

    return;
  }

  // -----------------------------
  // OpenAI Chat Completions
  // -----------------------------

  if (event.choices) {
    const delta =
      event.choices[0]?.delta;

    if (delta?.reasoning_content) {
      state.reasoning +=
        delta.reasoning_content;

      ui.appendThinking(
        delta.reasoning_content
      );
    }

    if (delta?.content) {
      state.message += delta.content;
      ui.appendText(delta.content);
    }

    if (delta?.tool_calls) {
      state.toolCalls.push(
        ...delta.tool_calls
      );
    }

    return;
  }

  // -----------------------------
  // Final snapshots
  // -----------------------------

  if (event.output) {
    for (const item of event.output) {

      if (
        item.type === "reasoning" ||
        item.type === "thinking"
      ) {
        const chunk =
          item.content?.slice(
            state.reasoning.length
          ) || "";

        if (chunk) {
          state.reasoning += chunk;
          ui.appendThinking(chunk);
        }
      }

      if (
        item.type === "message" ||
        item.type === "text"
      ) {
        const chunk =
          item.content?.slice(
            state.message.length
          ) || "";

        if (chunk) {
          state.message += chunk;
          ui.appendText(chunk);
        }
      }

      if (
        item.type === "tool_call" ||
        item.type === "function_call"
      ) {
        state.toolCalls.push(item);
      }
    }
  }

  // metadata

  if (event.stats)
    state.stats = event.stats;

  if (event.response_id)
    state.responseId =
      event.response_id;
}

  /* ── MAIN SEND (STREAMING) ───────────────────────────────── */
  async function sendMsg() {
    const text = ta.value.trim();
    if (!text && !attachedImgs.length) return;
    if (loading) return;

    const imgs = [...attachedImgs];
    attachedImgs = []; updatePreviews();
    ta.value = ''; ta.style.height = 'auto';
    addUserMsg(text, imgs);

    loading = true; sendBtn.disabled = true;

    const c = cfg();

    // ── Build current-turn input (text + images) ──────────────
    const inputArr = [];
    if (text) inputArr.push({ type: 'text', content: text });
    for (const img of imgs) inputArr.push({ type: 'image', data_url: img.url });
    // Use plain string for text-only; array when images are present
    const inputVal = inputArr.length === 1 && inputArr[0].type === 'text'
      ? text
      : inputArr;

    // ── Inject conversation history into system prompt ────────
    // previous_response_id is unreliable (state lost on tunnel/server restart).
    // Instead we keep history client-side and pass it in the system_prompt so
    // the current `input` stays in the proper format (text + images).
    let fullSystemPrompt = SYSTEM_PROMPT;
    if (conversation.length > 0) {
      const historyBlock = conversation.map(m => {
        const role = m.role === 'user' ? 'User' : 'Assistant';
        const imgNote = m.hasImages ? ' [+ image]' : '';
        return `${role}${imgNote}: ${m.content}`;
      }).join('\n\n');
      fullSystemPrompt += `\n\n<conversation_history>\n${historyBlock}\n</conversation_history>\nContinue the conversation. The next message is from the User.`;
    }

    // Push current user turn AFTER building history so it isn't double-counted
    conversation.push({ role: 'user', content: text, hasImages: imgs.length > 0 });

    const body = {
      model:          c.model,
      input:          inputVal,        // current turn — may include images
      system_prompt:  fullSystemPrompt, // carries full chat history as text
      context_length: CONTEXT_LEN,
      temperature:    0.6,
      reasoning:      c.reasoning,
      store:          false,           // no server-side storage needed; we track locally
      stream:         true,
    };
    if (MCP_PLUGIN) body.integrations = [{ type: 'plugin', id: MCP_PLUGIN }];

    // Create live bot message UI
    const ui = createBotMessage();

    // Accumulated stream state
    const state = {
      reasoning: '', message: '', toolCalls: [],
      stats: null, responseId: null,
      blocks: {}, currentBlockIdx: 0
    };

    try {
      const res = await fetch(`${c.url}/api/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${c.apiKey}`,
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`HTTP ${res.status} — ${errText.slice(0, 300)}`);
      }

      // If the server returned a non-stream (e.g. stream not supported), parse directly
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('event-stream') && !ct.includes('text/plain')) {
        // Fallback: treat as normal JSON
        const data = await res.json();
        let msg = '', reasoning = '';
        const tools = [];
        for (const item of data.output || []) {
          if (item.type === 'reasoning') reasoning = item.content;
          else if (item.type === 'message') msg = item.content;
          else if (item.type === 'tool_call') tools.push(item);
        }
        if (reasoning) { ui.appendThinking(reasoning); }
        ui.finalize(msg, tools, data.stats, data.response_id);
        if (msg) conversation.push({ role: 'assistant', content: msg });
        return;
      }

      // ── Parse SSE stream ──
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? ''; // last partial line stays in buffer

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue; // SSE comment or blank

          if (trimmed === 'data: [DONE]') break outer;

          if (trimmed.startsWith('data: ')) {
            const jsonStr = trimmed.slice(6);
            try {
              const event = JSON.parse(jsonStr);
              processSSEEvent(event, ui, state);
            } catch(e) {
              // non-JSON data line, skip
            }
          }
          // Some servers send event: lines before data: — ignore event type, only parse data
        }
      }

      // Stream ended — finalize UI and save assistant turn to local history
      ui.finalize(state.message, state.toolCalls, state.stats, state.responseId);
      if (state.message) {
        conversation.push({ role: 'assistant', content: state.message });
      }

    } catch(e) {
      // Show error inside the message container
      ui.textFinal.style.display = '';
      ui.textLive.style.display = 'none';
      ui.textFinal.innerHTML = `<div class="aicw-err"><strong>Error:</strong> ${esc(e.message)}</div>`;
      scrollBottom();
    } finally {
      loading = false; sendBtn.disabled = false;
    }
  }

})();
