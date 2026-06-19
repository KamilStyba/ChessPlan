/* ============================================================
   AI Chat Widget — Road to II kat. theme
   v4 — streaming + reliable visualizations (fixed)
   ============================================================
   KEY FIX: IFRAME_SCALER now overrides min-height:100vh / height:100vh
   that the AI template injects. In a 160px iframe, 100vh=160px, so
   Chart.js rendered into a tiny box and height was never corrected.
   Overriding with min-height:0!important lets body grow to content height.
   ============================================================ */
(function () {

  // ── CONFIG ────────────────────────────────────────────────
  const TUNNEL_URL  = "https://jenny-filed-motors-nhs.trycloudflare.com";
  const MODEL       = "qwen/qwen3.5-9b";
  const API_KEY     = "sk-lm-mckv4g0w:zoEdEPITwMXsvJQVpUZZ";
  const REASONING   = "on";
  const CONTEXT_LEN = 24000;
  const MCP_PLUGIN  = "mcp/serper-search";

  // NOTE: No min-height:100vh — breaks iframe height detection.
  // Using padding-based layout so body height equals content height.
  const SYSTEM_PROMPT = `You are a helpful AI assistant with web search capability.

When asked to create any chart, graph, plot, or data visualization, respond with a COMPLETE self-contained HTML code block (\`\`\`html) using Chart.js from CDN. Use this exact template:

<!DOCTYPE html><html><head><meta charset="utf-8"><script src="https://cdn.jsdelivr.net/npm/chart.js"><\/script></head><body style="margin:0;padding:20px;background:#0d0d0d"><div style="width:100%;max-width:780px;margin:0 auto"><canvas id="c"></canvas></div><script>Chart.defaults.color='#c9c9c9';Chart.defaults.borderColor='rgba(255,255,255,0.08)';Chart.defaults.font.family="'Segoe UI',system-ui,sans-serif";new Chart(document.getElementById('c'),{type:'bar',data:{labels:[],datasets:[]},options:{responsive:true,maintainAspectRatio:true,aspectRatio:1.7,plugins:{legend:{display:true},title:{display:true,text:'Chart Title'}}}});<\/script></body></html>

CRITICAL visualization rules:
- NEVER use 100vh, min-height:100vh, or any viewport-height units — they break embedded rendering.
- ALWAYS use options.responsive:true and aspectRatio:1.7 (or similar). Never hard-code canvas pixel sizes.
- Dark theme: background #0d0d0d. Primary accent #d4a017 (gold). Multi-series: #5ba0dc, #7ec97e, #dc6060, #b87edc, #e0b050.
- Add a meaningful title, axis labels, and legend when relevant.

When drawing a diagram or flowchart, respond with a \`\`\`svg code block that INCLUDES a viewBox attribute and uses the same dark theme + gold accents.

Keep all visualization code fully self-contained.`;

  /* ── CSS ─────────────────────────────────────────────────── */
  const CSS = `
    #aicw-wrap *{box-sizing:border-box;margin:0;padding:0}

    /* ── Bubble ── */
    #aicw-bubble{position:fixed;bottom:24px;right:24px;z-index:99999;width:54px;height:54px;border-radius:50%;background:#d4a017;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 24px rgba(212,160,23,.45);font-size:22px;color:#0d0d0d;transition:transform .2s,box-shadow .2s,background .2s,color .2s}
    #aicw-bubble:hover{transform:scale(1.09);box-shadow:0 6px 32px rgba(212,160,23,.6)}
    #aicw-bubble.open{background:#1a1a1a;color:#d4a017;box-shadow:0 4px 20px rgba(0,0,0,.7)}

    /* ── Panel — uses visibility+opacity so iframes render even when closed ── */
    #aicw-panel{position:fixed;bottom:90px;right:24px;z-index:99999;width:460px;height:640px;max-height:84vh;background:#0d0d0d;border:1px solid rgba(255,255,255,.1);border-radius:16px;display:flex;flex-direction:column;box-shadow:0 16px 64px rgba(0,0,0,.95);overflow:hidden;font-family:'Segoe UI',system-ui,sans-serif;font-size:14px;visibility:hidden;opacity:0;pointer-events:none;transform:translateY(10px) scale(.97);transition:visibility 0s .2s,transform .2s cubic-bezier(.22,1,.36,1),opacity .2s}
    #aicw-panel.open{visibility:visible;opacity:1;pointer-events:all;transform:none;transition:visibility 0s,transform .2s cubic-bezier(.22,1,.36,1),opacity .2s}

    /* ── Header ── */
    #aicw-hdr{display:flex;align-items:center;gap:10px;padding:13px 16px;border-bottom:1px solid rgba(255,255,255,.07);background:#111;flex-shrink:0}
    .aicw-hdr-title{font-size:14px;font-weight:600;color:#f0f0f0}
    .aicw-hdr-sub{font-size:11px;color:#484848;margin-top:1px}
    .aicw-hdr-btns{display:flex;gap:2px;margin-left:auto}
    .aicw-hbtn{background:none;border:none;cursor:pointer;color:#484848;font-size:16px;padding:5px 7px;border-radius:7px;line-height:1;transition:color .15s,background .15s}
    .aicw-hbtn:hover{color:#f0f0f0;background:rgba(255,255,255,.07)}

    /* ── Settings ── */
    #aicw-settings{padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.07);background:#121212;flex-shrink:0;display:none}
    #aicw-settings.open{display:block}
    .aicw-slabel{font-size:10px;color:#484848;margin-bottom:5px;margin-top:10px;text-transform:uppercase;letter-spacing:.06em}
    .aicw-slabel:first-child{margin-top:0}
    .aicw-sinput{width:100%;background:#1a1a1a;border:1px solid rgba(255,255,255,.08);border-radius:7px;padding:7px 10px;color:#f0f0f0;font-size:12px;outline:none;font-family:monospace;transition:border .15s}
    .aicw-sinput:focus{border-color:rgba(212,160,23,.45)}

    /* ── Messages ── */
    #aicw-msgs{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:4px;scrollbar-width:thin;scrollbar-color:#222 transparent}
    #aicw-msgs::-webkit-scrollbar{width:4px}
    #aicw-msgs::-webkit-scrollbar-thumb{background:#222;border-radius:2px}

    /* ── Empty state ── */
    #aicw-empty{text-align:center;margin:auto;padding:40px 20px}
    #aicw-empty .ei{font-size:38px;margin-bottom:12px;opacity:.4}
    #aicw-empty .et{font-size:14px;color:#444;font-weight:500}
    #aicw-empty .es{font-size:12px;color:#333;margin-top:5px}

    /* ── User message ── */
    .aicw-umsg{display:flex;justify-content:flex-end;margin-bottom:14px}
    .aicw-ububble{max-width:82%;background:rgba(212,160,23,.07);border:1px solid rgba(212,160,23,.17);border-radius:14px 14px 4px 14px;padding:10px 14px;color:#f0f0f0;font-size:14px;line-height:1.65;white-space:pre-wrap;word-break:break-word}
    .aicw-uimgs{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;margin-bottom:6px}
    .aicw-uimg{width:72px;height:72px;object-fit:cover;border-radius:8px;border:1px solid rgba(255,255,255,.1)}

    /* ── Bot message ── */
    .aicw-bmsg{margin-bottom:16px}

    /* ── Thinking block ── */
    .aicw-think{background:#0e0c08;border:1px solid rgba(180,130,20,.18);border-radius:10px;margin-bottom:8px;overflow:hidden}
    .aicw-think-hdr-static{display:flex;align-items:center;gap:7px;padding:9px 12px}
    .aicw-think-hdr-btn{display:flex;align-items:center;gap:7px;padding:9px 12px;cursor:pointer;user-select:none;background:none;border:none;width:100%;text-align:left;transition:background .15s}
    .aicw-think-hdr-btn:hover{background:rgba(180,130,20,.05)}
    .aicw-caret{font-size:10px;color:#5e4818;transition:transform .2s;display:inline-block;line-height:1}
    .aicw-caret.closed{transform:rotate(-90deg)}
    .aicw-think-label{font-size:12px;color:#9a7438;font-weight:500}
    .aicw-think-body{padding:0 12px 12px;font-size:12px;color:#8a6830;line-height:1.7;font-family:monospace;white-space:pre-wrap;word-break:break-word;max-height:260px;overflow-y:auto;opacity:.85}
    .aicw-think-dots span{display:inline-block;width:4px;height:4px;border-radius:50%;background:#9a7438;margin-right:3px;animation:aicw-pulse 1.2s infinite}
    .aicw-think-dots span:nth-child(2){animation-delay:.2s}
    .aicw-think-dots span:nth-child(3){animation-delay:.4s}
    @keyframes aicw-pulse{0%,80%,100%{opacity:.15}40%{opacity:1}}

    /* ── Tool call block ── */
    .aicw-tool{background:#070d16;border:1px solid rgba(60,120,200,.18);border-radius:10px;margin-bottom:8px;overflow:hidden}
    .aicw-tool-hdr{display:flex;align-items:center;gap:8px;padding:9px 12px;cursor:pointer;user-select:none;background:none;border:none;width:100%;text-align:left;transition:background .15s}
    .aicw-tool-hdr:hover{background:rgba(60,120,200,.06)}
    .aicw-tool-icon{font-size:12px;color:#4888c0}
    .aicw-tool-name{font-size:12px;font-family:monospace;color:#4888c0;font-weight:500}
    .aicw-tool-provider{font-size:10px;color:rgba(72,136,192,.65);background:rgba(72,136,192,.08);border:1px solid rgba(72,136,192,.15);border-radius:4px;padding:1px 7px}
    .aicw-tool-caret{font-size:10px;color:#1a3450;margin-left:auto;transition:transform .2s;display:inline-block}
    .aicw-tool-caret.closed{transform:rotate(-90deg)}
    .aicw-tool-body{padding:0 12px 10px}
    .aicw-tlabel{font-size:10px;color:#333;text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px;margin-top:8px}
    .aicw-tlabel:first-child{margin-top:0}
    .aicw-tpre{background:#040b12;border:1px solid rgba(60,120,200,.18);border-radius:6px;padding:8px 10px;font-size:11px;color:#78a8c8;overflow-x:auto;margin:0;font-family:monospace;white-space:pre-wrap;word-break:break-word;max-height:160px;overflow-y:auto;line-height:1.5}

    /* ── Text ── */
    .aicw-text{font-size:14px;color:#e6e6e6;line-height:1.75;word-break:break-word}
    .aicw-text-live{font-size:14px;color:#e6e6e6;line-height:1.75;white-space:pre-wrap;word-break:break-word}
    .aicw-text code{background:#181818;border:1px solid rgba(255,255,255,.09);border-radius:4px;padding:2px 5px;font-family:monospace;font-size:12px;color:#d4a017}
    .aicw-codeblock{background:#050a0f;border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:11px 14px;font-size:12px;font-family:monospace;color:#90b8d0;overflow-x:auto;margin:8px 0;white-space:pre;line-height:1.55}
    .aicw-stats{margin-top:8px;font-size:11px;color:#303030;display:flex;gap:12px}
    .aicw-err{background:#0d0808;border:1px solid rgba(200,60,60,.2);border-radius:10px;padding:10px 14px;font-size:13px;color:#c05050;margin-bottom:8px}

    /* ── Visualization container ── */
    .aicw-viz{border-radius:10px;margin:10px 0;overflow:hidden;border:1px solid rgba(255,255,255,.09);background:#0a0a0a}
    .aicw-viz-bar{display:flex;align-items:center;justify-content:space-between;padding:7px 10px;background:#111;border-bottom:1px solid rgba(255,255,255,.06)}
    .aicw-viz-label{font-size:11px;color:#444;display:flex;align-items:center;gap:5px}
    .aicw-viz-label .viz-icon{color:#d4a017;opacity:.7}
    .aicw-viz-btns{display:flex;gap:5px;align-items:center}
    .aicw-viz-toggle{font-size:11px;color:#444;background:none;border:1px solid rgba(255,255,255,.09);border-radius:5px;padding:3px 8px;cursor:pointer;transition:color .15s,border .15s;line-height:1.4}
    .aicw-viz-toggle:hover{color:#bbb;border-color:rgba(255,255,255,.22)}
    .aicw-viz-expand{font-size:11px;color:#d4a017;background:rgba(212,160,23,.05);border:1px solid rgba(212,160,23,.28);border-radius:5px;padding:3px 9px;cursor:pointer;transition:all .15s;line-height:1.4}
    .aicw-viz-expand:hover{background:rgba(212,160,23,.14);border-color:rgba(212,160,23,.65)}

    /* ── Viz content wrapper + loader ── */
    .aicw-viz-wrap{position:relative;min-height:80px;background:#0d0d0d}
    .aicw-viz-frame{width:100%;border:none;display:block;background:#0d0d0d;transition:height .3s ease}
    .aicw-viz-loader{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:9px;background:#0d0d0d;z-index:2;pointer-events:none;transition:opacity .4s .15s}
    .aicw-viz-loader.hidden{opacity:0}
    .aicw-spinner{width:22px;height:22px;border:2px solid rgba(212,160,23,.12);border-top-color:rgba(212,160,23,.65);border-radius:50%;animation:aicw-spin .75s linear infinite}
    .aicw-viz-loadtxt{font-size:11px;color:#2a2a2a}
    @keyframes aicw-spin{to{transform:rotate(360deg)}}
    .aicw-viz-svg{padding:14px;background:#0a0a12;display:flex;justify-content:center;align-items:flex-start}
    .aicw-viz-svg svg{width:100%;height:auto;display:block;max-height:480px}
    .aicw-viz-src{background:#040910;padding:10px 13px;font-size:11px;font-family:monospace;color:#78a8c8;white-space:pre;overflow-x:auto;line-height:1.5;max-height:220px;overflow-y:auto;display:none;border-top:1px solid rgba(255,255,255,.06)}
    .aicw-viz-src.show{display:block}

    /* ── Fullscreen overlay ── */
    #aicw-overlay{position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,.96);display:flex;flex-direction:column;font-family:'Segoe UI',system-ui,sans-serif;animation:aicw-fade .15s ease}
    @keyframes aicw-fade{from{opacity:0}to{opacity:1}}
    #aicw-overlay-bar{display:flex;align-items:center;justify-content:space-between;padding:10px 16px;background:#111;border-bottom:1px solid rgba(255,255,255,.08);flex-shrink:0}
    #aicw-overlay-title{font-size:13px;color:#555}
    #aicw-overlay-bar button{background:none;border:1px solid rgba(255,255,255,.15);color:#999;border-radius:7px;padding:5px 14px;cursor:pointer;font-size:13px;transition:all .15s}
    #aicw-overlay-bar button:hover{background:rgba(255,255,255,.07);color:#f0f0f0;border-color:rgba(255,255,255,.28)}
    #aicw-overlay-copy.copied{color:#7ec97e;border-color:rgba(126,201,126,.4)}
    #aicw-overlay-content{flex:1;display:flex;width:100%;overflow:auto;background:#0d0d0d}
    #aicw-overlay-content iframe{flex:1;width:100%;min-height:100%;border:none;display:block;background:#0d0d0d}
    .aicw-overlay-svg{margin:auto;padding:28px;display:flex;align-items:center;justify-content:center;width:100%}
    .aicw-overlay-svg svg{max-width:94vw;max-height:86vh;width:auto;height:auto}

    /* ── Image previews ── */
    #aicw-previews{padding:8px 12px 0;display:none;gap:7px;flex-wrap:wrap;border-top:1px solid rgba(255,255,255,.06);flex-shrink:0}
    #aicw-previews.show{display:flex}
    .aicw-pw{position:relative}
    .aicw-pi{width:56px;height:56px;object-fit:cover;border-radius:7px;border:1px solid rgba(255,255,255,.1)}
    .aicw-prm{position:absolute;top:-5px;right:-5px;width:17px;height:17px;border-radius:50%;background:#222;border:1px solid rgba(255,255,255,.15);color:#888;font-size:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1;transition:all .15s}
    .aicw-prm:hover{background:#333;color:#f0f0f0}

    /* ── Input row ── */
    #aicw-inrow{padding:10px 12px;border-top:1px solid rgba(255,255,255,.06);display:flex;gap:8px;align-items:flex-end;flex-shrink:0;background:#111}
    .aicw-ibtn{background:none;border:1px solid rgba(255,255,255,.09);border-radius:8px;width:36px;height:36px;cursor:pointer;color:#444;font-size:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:border .15s,color .15s}
    .aicw-ibtn:hover{border-color:rgba(255,255,255,.2);color:#ccc}
    #aicw-ta{flex:1;background:#181818;border:1px solid rgba(255,255,255,.09);border-radius:10px;padding:9px 12px;color:#f0f0f0;font-size:14px;outline:none;resize:none;font-family:inherit;line-height:1.5;max-height:120px;overflow-y:auto;transition:border .15s,background .15s;min-height:38px}
    #aicw-ta:focus{border-color:rgba(212,160,23,.4);background:#1a1a1a}
    #aicw-ta::placeholder{color:#2e2e2e}
    #aicw-send{background:#d4a017;border:none;border-radius:8px;width:36px;height:36px;cursor:pointer;color:#0d0d0d;font-size:16px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-weight:700;transition:opacity .15s,transform .15s,background .15s}
    #aicw-send:hover:not(:disabled){opacity:.85}
    #aicw-send:active:not(:disabled){transform:scale(.93)}
    #aicw-send:disabled{opacity:.28;cursor:not-allowed}
    #aicw-send.stop{background:#c04040;color:#fff}
  `;

  /* ── INJECT STYLES ───────────────────────────────────────── */
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  document.head.appendChild(styleEl);

  /* ── DOM ─────────────────────────────────────────────────── */
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
  const collapsed    = {};
  const vizRegistry  = {};   // vizId → { type:'html'|'svg', code }
  let abortController = null;

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
    bubble.classList.toggle('open', panelOpen);
    bubble.textContent = panelOpen ? '✕' : '♟';
    if (panelOpen) {
      // Focus textarea after open animation completes
      setTimeout(() => ta.focus(), 220);
      // Nudge any existing viz iframes to re-measure themselves
      // (they render even when panel is hidden via visibility:hidden)
      document.querySelectorAll('iframe[data-viz-frame]').forEach(f => {
        try { f.contentWindow.postMessage({ type: 'aicw-remeasure' }, '*'); } catch (_) {}
      });
    }
  };

  document.getElementById('aicw-closebtn').onclick = () => {
    panelOpen = false;
    panel.classList.remove('open');
    bubble.classList.remove('open');
    bubble.textContent = '♟';
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
  document.getElementById('aicw-filein').onchange = e => {
    for (const f of e.target.files) readFile(f);
    e.target.value = '';
  };

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
  sendBtn.onclick = () => { if (loading) abortController?.abort(); else sendMsg(); };

  /* ── COLLAPSE HELPERS ────────────────────────────────────── */
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

  window.__aicwVizCopy = id => {
    const v = vizRegistry[id]; if (!v) return;
    const btn = document.getElementById(`aicw-vcopy-${id}`);
    navigator.clipboard?.writeText(v.code).then(() => {
      if (!btn) return;
      const prev = btn.textContent;
      btn.textContent = '✓ Copied';
      setTimeout(() => (btn.textContent = prev), 1400);
    });
  };

  /* ── FULLSCREEN OVERLAY ──────────────────────────────────── */
  window.__aicwExpand = id => { const v = vizRegistry[id]; if (v) openOverlay(v); };

  function closeOverlay() {
    const o = document.getElementById('aicw-overlay');
    if (o) o.remove();
  }

  function openOverlay(viz) {
    closeOverlay();
    const overlay = document.createElement('div');
    overlay.id = 'aicw-overlay';
    overlay.innerHTML = `
      <div id="aicw-overlay-bar">
        <span id="aicw-overlay-title">${viz.type === 'svg' ? '▲ SVG diagram' : '▊ HTML visualization'}</span>
        <div style="display:flex;gap:8px;align-items:center">
          <button id="aicw-overlay-copy">⧉ Copy code</button>
          <button id="aicw-overlay-close">✕ Close</button>
        </div>
      </div>
      <div id="aicw-overlay-content"></div>`;
    document.body.appendChild(overlay);
    const content = overlay.querySelector('#aicw-overlay-content');
    if (viz.type === 'html') {
      const iframe = document.createElement('iframe');
      iframe.sandbox = 'allow-scripts allow-same-origin';
      iframe.srcdoc = injectScaler(viz.code, true);
      content.appendChild(iframe);
    } else {
      const box = document.createElement('div');
      box.className = 'aicw-overlay-svg';
      box.innerHTML = viz.code;
      const svg = box.querySelector('svg');
      if (svg) {
        const w = parseFloat(svg.getAttribute('width'))  || 0;
        const h = parseFloat(svg.getAttribute('height')) || 0;
        if (!svg.getAttribute('viewBox') && w && h) svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
        svg.removeAttribute('width'); svg.removeAttribute('height');
      }
      content.appendChild(box);
    }
    overlay.querySelector('#aicw-overlay-close').onclick = closeOverlay;
    overlay.querySelector('#aicw-overlay-copy').onclick = function () {
      navigator.clipboard?.writeText(viz.code).then(() => {
        this.textContent = '✓ Copied'; this.classList.add('copied');
        setTimeout(() => { this.textContent = '⧉ Copy code'; this.classList.remove('copied'); }, 1500);
      });
    };
    overlay.addEventListener('click', e => { if (e.target === overlay) closeOverlay(); });
  }

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (document.getElementById('aicw-overlay')) { closeOverlay(); return; }
    if (settingsOpen) { settingsOpen = false; document.getElementById('aicw-settings').classList.remove('open'); }
  });

  /* ── HELPERS ─────────────────────────────────────────────── */
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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

      if (lang === 'html' || lang === 'svg') {
        const isSvg = lang === 'svg';
        vizRegistry[vizId] = { type: lang, code };
        const icon  = isSvg ? '▲' : '▊';
        const label = isSvg ? 'SVG diagram' : 'HTML visualization';
        // HTML gets a wrapper with a loading spinner; SVG is injected directly
        const stage = isSvg
          ? `<div class="aicw-viz-svg" id="aicw-vsvg-${vizId}" data-src="${b64enc(code)}"></div>`
          : `<div class="aicw-viz-wrap">
               <div class="aicw-viz-loader" id="aicw-vloader-${vizId}">
                 <div class="aicw-spinner"></div>
                 <span class="aicw-viz-loadtxt">Rendering…</span>
               </div>
               <div id="aicw-vframe-${vizId}" data-src="${b64enc(code)}"></div>
             </div>`;
        return `<div class="aicw-viz">
          <div class="aicw-viz-bar">
            <span class="aicw-viz-label"><span class="viz-icon">${icon}</span> ${label}</span>
            <div class="aicw-viz-btns">
              <button class="aicw-viz-toggle" id="aicw-vcopy-${vizId}" onclick="window.__aicwVizCopy('${vizId}')" title="Copy code">⧉ Copy</button>
              <button class="aicw-viz-toggle" id="aicw-vtog-${vizId}" onclick="window.__aicwVizToggle('${vizId}')">View code</button>
              <button class="aicw-viz-expand" onclick="window.__aicwExpand('${vizId}')">⤢ Expand</button>
            </div>
          </div>
          ${stage}
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

  /* ── IFRAME SCALER ───────────────────────────────────────────────────────────
   * Injected into every chat-mode HTML viz iframe.
   *
   * THE KEY FIX — CSS overrides:
   *   The AI template uses `min-height:100vh` on <body>. Inside a 240px iframe
   *   that makes 100vh=240px, so Chart.js treats the canvas container as 240px
   *   tall and the height reporter just echoes that back — iframe never grows.
   *   Setting min-height:0!important and height:auto!important via a <style>
   *   block (which wins over inline styles when !important is used) lets the
   *   body shrink to its content, so Chart.js lays out correctly and the
   *   ResizeObserver reports the true rendered height.
   *
   * Script behaviour:
   *   • ResizeObserver on <html>, <body>, and every <canvas> element
   *   • Canvas elements are discovered lazily (Chart.js adds them after load)
   *   • Polls for 12 s (48 × 250 ms) to catch async CDN-loaded libraries
   *   • Responds to aicw-remeasure messages so the parent can force a recheck
   * ──────────────────────────────────────────────────────────────────────────── */
  const IFRAME_SCALER = `<style>html,body{min-height:0!important;height:auto!important}body{overflow-x:hidden!important;overflow-y:hidden!important;scrollbar-width:none!important;-ms-overflow-style:none!important}body::-webkit-scrollbar{display:none!important}canvas{max-width:100%!important;box-sizing:border-box!important}</style><script>(function(){var lastH=0,raf=0;function getH(){var b=document.body;if(!b)return 80;var h=Math.max(b.scrollHeight,b.offsetHeight,document.documentElement.scrollHeight,document.documentElement.offsetHeight);document.querySelectorAll('canvas').forEach(function(c){try{var r=c.getBoundingClientRect();var bottom=r.top+r.height+(window.pageYOffset||0);if(bottom>h)h=bottom;}catch(e){}});return h||80;}function measure(){var b=document.body;if(!b)return;b.style.transform='';b.style.transformOrigin='top left';var natW=Math.max(b.scrollWidth,b.offsetWidth,1);var vw=document.documentElement.clientWidth||window.innerWidth||natW;var s=1;if(natW>vw+2){s=vw/natW;b.style.transform='scale('+s+')';b.style.transformOrigin='top left';}var natH=getH();var out=Math.ceil(natH*s)+4;if(Math.abs(out-lastH)>1){lastH=out;window.parent.postMessage({type:'aicw-h',h:out},'*');}}function schedule(){if(raf)cancelAnimationFrame(raf);raf=requestAnimationFrame(measure);}var ro;if(window.ResizeObserver){ro=new ResizeObserver(schedule);try{ro.observe(document.documentElement);if(document.body)ro.observe(document.body);}catch(e){}}var watched=new WeakSet();function watchCanvases(){document.querySelectorAll('canvas').forEach(function(c){if(!watched.has(c)){watched.add(c);if(ro)try{ro.observe(c);}catch(e){}}});}window.addEventListener('resize',schedule);window.addEventListener('message',function(e){if(e.data&&e.data.type==='aicw-remeasure'){schedule();watchCanvases();}});if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',function(){schedule();watchCanvases();});}else{schedule();watchCanvases();}window.addEventListener('load',function(){schedule();watchCanvases();[100,300,700,1500,3000,5000].forEach(function(t){setTimeout(function(){schedule();watchCanvases();},t);});});var n=0,iv=setInterval(function(){schedule();watchCanvases();if(++n>48)clearInterval(iv);},250);})();<\/script>`;

  // Fullscreen scaler — iframe fills viewport, so no height reporting needed.
  const IFRAME_SCALER_FS = `<style>html,body{width:100%!important;margin:0!important;overflow:auto!important;background:#0d0d0d!important}body{display:flex!important;align-items:center!important;justify-content:center!important;min-height:100vh!important;box-sizing:border-box!important;padding:28px!important}canvas{max-width:94vw!important;max-height:88vh!important}</style>`;

  function injectScaler(html, fullscreen) {
    if (fullscreen) {
      return html.includes('</head>')
        ? html.replace('</head>', IFRAME_SCALER_FS + '</head>')
        : IFRAME_SCALER_FS + html;
    }
    const styleTag  = IFRAME_SCALER.slice(0, IFRAME_SCALER.indexOf('<script>'));
    const scriptTag = IFRAME_SCALER.slice(IFRAME_SCALER.indexOf('<script>'));
    if (html.includes('</head>')) html = html.replace('</head>', styleTag + '</head>');
    else html = styleTag + html;
    if (html.includes('</body>')) html = html.replace(/(<\/body>)(?![\s\S]*<\/body>)/, scriptTag + '$1');
    else html = html + scriptTag;
    return html;
  }

  /* ── VIZ BLOCK ACTIVATOR ─────────────────────────────────── */
  function activateVizBlocks(container) {
    // HTML iframes
    container.querySelectorAll('[id^="aicw-vframe-"]').forEach(el => {
      const encoded = el.dataset.src;
      if (!encoded) return;
      try {
        const raw  = b64dec(encoded);
        const html = injectScaler(raw);

        const iframe = document.createElement('iframe');
        iframe.className   = 'aicw-viz-frame';
        iframe.sandbox     = 'allow-scripts allow-same-origin';
        iframe.style.height = '240px';   // Initial estimate; postMessage corrects it
        iframe.srcdoc      = html;
        iframe.dataset.vizFrame = '1';

        // Dismiss the loading overlay once the iframe document has parsed
        const vizId = el.id.replace('aicw-vframe-', '');
        const loader = document.getElementById(`aicw-vloader-${vizId}`);
        iframe.addEventListener('load', () => {
          if (loader) {
            loader.classList.add('hidden');
            setTimeout(() => loader.parentNode && loader.remove(), 500);
          }
        });

        el.replaceWith(iframe);
      } catch (e) { /* malformed src, skip silently */ }
    });

    // SVG — inject inline and strip fixed dimensions so it scales via CSS
    container.querySelectorAll('[id^="aicw-vsvg-"]').forEach(el => {
      const encoded = el.dataset.src;
      if (!encoded) return;
      try {
        el.innerHTML = b64dec(encoded);
        const svg = el.querySelector('svg');
        if (svg) {
          const w = parseFloat(svg.getAttribute('width'))  || 0;
          const h = parseFloat(svg.getAttribute('height')) || 0;
          if (!svg.getAttribute('viewBox') && w && h) svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
          svg.removeAttribute('width');
          svg.removeAttribute('height');
        }
      } catch (e) {}
    });
  }

  /* ── postMessage HEIGHT LISTENER ─────────────────────────────────────────────
   * Receives { type:'aicw-h', h:<pixels> } from viz iframes and sets their
   * height. Queries ALL viz iframes in the document (not just ones visible in
   * the panel) because the panel may be hidden via visibility:hidden when the
   * message arrives, but the iframes are still rendering in the background.
   * Max clamped to 820 px — raise if you need taller charts.
   * ──────────────────────────────────────────────────────────────────────────── */
  window.addEventListener('message', e => {
    if (!e.data || e.data.type !== 'aicw-h') return;
    const h = Number(e.data.h);
    if (!h || h < 10 || !e.source) return;
    document.querySelectorAll('iframe[data-viz-frame]').forEach(iframe => {
      try {
        if (iframe.contentWindow === e.source) {
          iframe.style.height = Math.min(Math.max(h, 60), 820) + 'px';
        }
      } catch (_) {}
    });
  });

  /* ── USER MESSAGE ────────────────────────────────────────── */
  function addUserMsg(text, imgs) {
    const empty = document.getElementById('aicw-empty');
    if (empty) empty.remove();
    const div = document.createElement('div');
    div.className = 'aicw-umsg';
    const imgHtml  = imgs.length ? `<div class="aicw-uimgs">${imgs.map(i => `<img class="aicw-uimg" src="${i.url}">`).join('')}</div>` : '';
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

    // Thinking block (hidden until reasoning chunks arrive)
    const thinkWrap = document.createElement('div');
    thinkWrap.className = 'aicw-think';
    thinkWrap.style.display = 'none';

    const thinkHdrStatic = document.createElement('div');
    thinkHdrStatic.className = 'aicw-think-hdr-static';
    thinkHdrStatic.innerHTML = `<div class="aicw-think-dots"><span></span><span></span><span></span></div><span class="aicw-think-label">Thinking</span>`;

    const thinkBody = document.createElement('div');
    thinkBody.className = 'aicw-think-body';
    thinkWrap.append(thinkHdrStatic, thinkBody);

    const toolsDiv  = document.createElement('div');
    const textLive  = document.createElement('div');
    textLive.className = 'aicw-text-live';
    const textFinal = document.createElement('div');
    textFinal.className = 'aicw-text';
    textFinal.style.display = 'none';
    const statsDiv  = document.createElement('div');
    statsDiv.className = 'aicw-stats';

    botDiv.append(thinkWrap, toolsDiv, textLive, textFinal, statsDiv);
    msgs.appendChild(botDiv);

    const startTime = Date.now();
    let thinkShown = false, thinkDone = false;

    return {
      idx, botDiv, thinkWrap, thinkHdrStatic, thinkBody,
      toolsDiv, textLive, textFinal, statsDiv, startTime,
      thinkShown, thinkDone,

      appendThinking(chunk) {
        if (!this.thinkShown) { thinkWrap.style.display = ''; this.thinkShown = true; }
        thinkBody.textContent += chunk;
        scrollBottom();
      },

      sealThinking() {
        if (this.thinkDone) return;
        this.thinkDone = true;
        const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
        const key = `think-${this.idx}`;
        const btn = document.createElement('button');
        btn.className = 'aicw-think-hdr-btn';
        btn.onclick = () => window.__aicwToggle(key);
        btn.innerHTML = `<span class="aicw-caret" data-aicw-caret="${key}">▾</span>
          <span class="aicw-think-label">Thought for ${elapsed}s</span>`;
        thinkBody.setAttribute('data-aicw-body', key);
        thinkHdrStatic.replaceWith(btn);
      },

      appendText(chunk) {
        this.sealThinking();
        textLive.textContent += chunk;
        scrollBottom();
      },

      addToolCall(tc) {
        const key = `tool-${this.idx}-${tc.id}`;
        const provider = tc.provider_info?.plugin_id || tc.provider_info?.server_label || '';
        const provBadge = provider ? `<span class="aicw-tool-provider">${esc(provider)}</span>` : '';
        const argsStr   = JSON.stringify(tc.arguments ?? {}, null, 2);
        const div = document.createElement('div');
        div.className = 'aicw-tool';
        div.dataset.toolId = tc.id;
        div.innerHTML = `
          <button class="aicw-tool-hdr" onclick="window.__aicwToggle('${key}')">
            <span class="aicw-tool-icon">⚙</span>
            <span class="aicw-tool-name">${esc(tc.tool || 'Tool')}</span>
            ${provBadge}
            <span class="aicw-tool-caret" data-aicw-caret="${key}">▾</span>
          </button>
          <div class="aicw-tool-body" data-aicw-body="${key}">
            <div class="aicw-tlabel">Arguments</div>
            <pre class="aicw-tpre aicw-tool-args">${esc(argsStr)}</pre>
            <div class="aicw-tlabel">Result</div>
            <pre class="aicw-tpre aicw-tool-result"></pre>
          </div>`;
        toolsDiv.appendChild(div);
        scrollBottom();
      },

      updateToolCall(tc) {
        const div = toolsDiv.querySelector(`[data-tool-id="${tc.id}"]`);
        if (!div) return;
        div.querySelector('.aicw-tool-name').textContent = tc.tool || 'Tool';
        const args = div.querySelector('.aicw-tool-args');
        if (args) args.textContent = JSON.stringify(tc.arguments ?? {}, null, 2);
        const result = div.querySelector('.aicw-tool-result');
        if (result) result.textContent = typeof tc.output === 'string'
          ? tc.output : JSON.stringify(tc.output ?? '', null, 2);
      },

      finalize(fullMessage, toolCalls, stats, responseId) {
        this.sealThinking();
        for (const tc of toolCalls) {
          if (!toolsDiv.querySelector(`[data-tool-id="${tc.id}"]`)) this.addToolCall(tc);
        }
        textLive.style.display  = 'none';
        textFinal.style.display = '';
        if (fullMessage) {
          textFinal.innerHTML = renderMd(fullMessage, this.idx);
          activateVizBlocks(textFinal);
        } else if (!thinkBody.textContent && !toolsDiv.children.length) {
          textFinal.innerHTML = `<div class="aicw-err">No response received. Is the server running?</div>`;
          textFinal.style.display = '';
        }
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
  function processSSEEvent(event, ui, state) {
    if (!event || typeof event !== 'object') return;

    // ── LM Studio Chat API ──────────────────────────────────
    if (event.type === 'message.delta') {
      const chunk = event.content || '';
      state.message += chunk; ui.appendText(chunk);
      return;
    }

    if (event.type === 'reasoning.delta' || event.type === 'thinking.delta') {
      const chunk = event.content || event.delta?.text || event.delta?.thinking || '';
      if (!chunk) return;
      state.reasoning += chunk; ui.appendThinking(chunk);
      return;
    }

    // ── LM Studio Tool Calls ────────────────────────────────
    if (event.type === 'tool_call.start') {
      state.currentTool = { id: crypto.randomUUID(), tool: '', arguments: {}, output: '' };
      state.toolCalls.push(state.currentTool);
      return;
    }
    if (event.type === 'tool_call.name') {
      state.currentTool.tool = event.tool_name;
      if (!ui.toolsDiv.querySelector(`[data-tool-id="${state.currentTool.id}"]`))
        ui.addToolCall(state.currentTool);
      return;
    }
    if (event.type === 'tool_call.arguments') {
      const tool = state.currentTool; if (!tool) return;
      tool.arguments = event.arguments || {};
      ui.updateToolCall(tool);
      return;
    }
    if (event.type === 'tool_call.success') {
      const tool = state.currentTool; if (!tool) return;
      tool.status = 'success'; tool.output = event.output;
      ui.updateToolCall(tool);
      return;
    }
    if (event.type === 'tool_call.error') {
      const tool = state.currentTool; if (!tool) return;
      tool.status = 'error'; tool.error = event.error;
      ui.updateToolCall(tool);
      return;
    }

    // ── Anthropic content blocks ────────────────────────────
    if (event.type === 'content_start' || event.type === 'content_block_start') {
      state.currentBlockIdx = event.index ?? 0;
      state.blocks[state.currentBlockIdx] = {
        type: event.item?.type || event.content_block?.type || '',
        text: event.item?.content || event.content_block?.content || event.content_block?.thinking || ''
      };
      return;
    }
    if (event.type === 'content_delta' || event.type === 'content_block_delta') {
      const idx   = event.index ?? state.currentBlockIdx;
      const block = state.blocks[idx];
      if (!block) return;
      const chunk = event.delta?.text ?? event.delta?.thinking ?? event.delta?.content ?? '';
      if (!chunk) return;
      block.text += chunk;
      if (block.type === 'reasoning' || block.type === 'thinking') {
        state.reasoning += chunk; ui.appendThinking(chunk);
      } else {
        state.message += chunk; ui.appendText(chunk);
      }
      return;
    }

    // ── Responses API ───────────────────────────────────────
    if (event.type === 'response.output_text.delta') {
      const chunk = typeof event.delta === 'string' ? event.delta : event.delta?.text || '';
      state.message += chunk; ui.appendText(chunk);
      return;
    }
    if (event.type === 'response.reasoning.delta') {
      const chunk = typeof event.delta === 'string' ? event.delta : event.delta?.text || '';
      state.reasoning += chunk; ui.appendThinking(chunk);
      return;
    }
    if (event.type === 'response.function_call_arguments.delta') {
      let tool = state.toolCalls[state.toolCalls.length - 1];
      if (!tool) { tool = { id: Date.now(), name: 'function', arguments: '' }; state.toolCalls.push(tool); }
      tool.arguments += event.delta || event.arguments || '';
      return;
    }

    // ── OpenAI Chat Completions ─────────────────────────────
    if (event.choices) {
      const delta = event.choices[0]?.delta;
      if (delta?.reasoning_content) { state.reasoning += delta.reasoning_content; ui.appendThinking(delta.reasoning_content); }
      if (delta?.content)           { state.message   += delta.content;           ui.appendText(delta.content); }
      if (delta?.tool_calls)        { state.toolCalls.push(...delta.tool_calls); }
      return;
    }

    // ── Final snapshot (done event) ─────────────────────────
    if (event.output) {
      for (const item of event.output) {
        if (item.type === 'reasoning' || item.type === 'thinking') {
          const chunk = item.content?.slice(state.reasoning.length) || '';
          if (chunk) { state.reasoning += chunk; ui.appendThinking(chunk); }
        }
        if (item.type === 'message' || item.type === 'text') {
          const chunk = item.content?.slice(state.message.length) || '';
          if (chunk) { state.message += chunk; ui.appendText(chunk); }
        }
        if (item.type === 'tool_call' || item.type === 'function_call') {
          state.toolCalls.push(item);
        }
      }
    }

    if (event.stats)       state.stats      = event.stats;
    if (event.response_id) state.responseId = event.response_id;
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

    loading = true;
    abortController = new AbortController();
    sendBtn.textContent = '■'; sendBtn.classList.add('stop');

    const c = cfg();

    // Build current-turn input (text + optional images)
    const inputArr = [];
    if (text) inputArr.push({ type: 'text', content: text });
    for (const img of imgs) inputArr.push({ type: 'image', data_url: img.url });
    const inputVal = inputArr.length === 1 && inputArr[0].type === 'text' ? text : inputArr;

    // Inject conversation history into system prompt (server-side history is unreliable across tunnel restarts)
    let fullSystemPrompt = SYSTEM_PROMPT;
    if (conversation.length > 0) {
      const historyBlock = conversation.map(m => {
        const role    = m.role === 'user' ? 'User' : 'Assistant';
        const imgNote = m.hasImages ? ' [+ image]' : '';
        return `${role}${imgNote}: ${m.content}`;
      }).join('\n\n');
      fullSystemPrompt += `\n\n<conversation_history>\n${historyBlock}\n</conversation_history>\nContinue the conversation. The next message is from the User.`;
    }

    conversation.push({ role: 'user', content: text, hasImages: imgs.length > 0 });

    const body = {
      model:          c.model,
      input:          inputVal,
      system_prompt:  fullSystemPrompt,
      context_length: CONTEXT_LEN,
      temperature:    0.6,
      reasoning:      c.reasoning,
      store:          false,
      stream:         true,
    };
    if (MCP_PLUGIN) body.integrations = [{ type: 'plugin', id: MCP_PLUGIN }];

    const ui    = createBotMessage();
    const state = { reasoning: '', message: '', toolCalls: [], stats: null, responseId: null, blocks: {}, currentBlockIdx: 0 };

    try {
      const res = await fetch(`${c.url}/api/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${c.apiKey}`,
          'Accept':        'text/event-stream',
        },
        body:   JSON.stringify(body),
        signal: abortController.signal,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`HTTP ${res.status} — ${errText.slice(0, 300)}`);
      }

      // Fallback for servers that don't stream
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('event-stream') && !ct.includes('text/plain')) {
        const data = await res.json();
        let msg = '', reasoning = '';
        const tools = [];
        for (const item of data.output || []) {
          if (item.type === 'reasoning') reasoning = item.content;
          else if (item.type === 'message') msg = item.content;
          else if (item.type === 'tool_call') tools.push(item);
        }
        if (reasoning) ui.appendThinking(reasoning);
        ui.finalize(msg, tools, data.stats, data.response_id);
        if (msg) conversation.push({ role: 'assistant', content: msg });
        return;
      }

      // Parse SSE stream
      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;
          if (trimmed === 'data: [DONE]') break outer;
          if (trimmed.startsWith('data: ')) {
            try { processSSEEvent(JSON.parse(trimmed.slice(6)), ui, state); } catch (_) {}
          }
        }
      }

      ui.finalize(state.message, state.toolCalls, state.stats, state.responseId);
      if (state.message) conversation.push({ role: 'assistant', content: state.message });

    } catch (e) {
      if (e.name === 'AbortError') {
        ui.finalize(state.message, state.toolCalls, state.stats, state.responseId);
        if (state.message) conversation.push({ role: 'assistant', content: state.message });
      } else {
        ui.textLive.style.display  = 'none';
        ui.textFinal.style.display = '';
        ui.textFinal.innerHTML = `<div class="aicw-err"><strong>Error:</strong> ${esc(e.message)}</div>`;
        scrollBottom();
      }
    } finally {
      loading = false;
      sendBtn.disabled = false;
      sendBtn.textContent = '↑';
      sendBtn.classList.remove('stop');      
      abortController = null;    
    }
  }

})();
