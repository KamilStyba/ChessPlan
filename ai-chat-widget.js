(function () {
 // ── CONFIG ────────────────────────────────────────────────
const TUNNEL_URL  = "https://organizer-serves-mpeg-dim.trycloudflare.com";
const MODEL       = "qwen/qwen3.5-9b";

// Replace this line:
// const API_KEY  = "lm-studio"; 

// With your newly generated token:
const API_KEY     = "sk-lm-mckv4g0w:zoEdEPITwMXsvJQVpUZZ"; 

const REASONING   = "on";         
const CONTEXT_LEN = 24000;
const MCP_PLUGIN  = "mcp/serper-search"; 
// ─────────────────────────────────────────────────────────

  /* ── STYLES ─────────────────────────────────────────────── */
  const CSS = `
    #aicw-wrap *{box-sizing:border-box;margin:0;padding:0}
    #aicw-bubble{
      position:fixed;bottom:24px;right:24px;z-index:99999;
      width:54px;height:54px;border-radius:50%;
      background:#d4a017;border:none;cursor:pointer;
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 4px 24px rgba(212,160,23,.4);
      font-size:22px;color:#0d0d0d;
      transition:transform .15s,box-shadow .15s;
    }
    #aicw-bubble:hover{transform:scale(1.08);box-shadow:0 6px 32px rgba(212,160,23,.5)}
    #aicw-panel{
      position:fixed;bottom:90px;right:24px;z-index:99999;
      width:440px;height:620px;max-height:82vh;
      background:#0d0d0d;border:1px solid rgba(255,255,255,.12);border-radius:16px;
      display:none;flex-direction:column;
      box-shadow:0 12px 60px rgba(0,0,0,.9);overflow:hidden;
      font-family:'Segoe UI',system-ui,sans-serif;font-size:14px;
    }
    #aicw-panel.open{display:flex}

    /* Header */
    #aicw-hdr{
      display:flex;align-items:center;gap:10px;padding:13px 16px;
      border-bottom:1px solid rgba(255,255,255,.07);
      background:#161616;flex-shrink:0;
    }
    .aicw-hdr-title{font-size:14px;font-weight:600;color:#f0f0f0}
    .aicw-hdr-sub{font-size:11px;color:#666;margin-top:1px}
    .aicw-hdr-btns{display:flex;gap:2px;margin-left:auto}
    .aicw-hbtn{
      background:none;border:none;cursor:pointer;color:#666;font-size:17px;
      padding:4px 7px;border-radius:6px;line-height:1;transition:color .15s,background .15s;
    }
    .aicw-hbtn:hover{color:#f0f0f0;background:rgba(255,255,255,.06)}

    /* Settings */
    #aicw-settings{
      padding:12px 16px;border-bottom:1px solid rgba(255,255,255,.07);
      background:#1c1c1c;flex-shrink:0;display:none;
    }
    #aicw-settings.open{display:block}
    .aicw-slabel{font-size:11px;color:#666;margin-bottom:4px;margin-top:10px}
    .aicw-slabel:first-child{margin-top:0}
    .aicw-sinput{
      width:100%;background:#1f1f1f;border:1px solid rgba(255,255,255,.07);
      border-radius:7px;padding:7px 10px;color:#f0f0f0;font-size:12px;
      outline:none;font-family:monospace;transition:border .15s;
    }
    .aicw-sinput:focus{border-color:rgba(212,160,23,.4)}

    /* Messages */
    #aicw-msgs{
      flex:1;overflow-y:auto;padding:16px;
      display:flex;flex-direction:column;gap:4px;
      scrollbar-width:thin;scrollbar-color:#333 transparent;
    }
    #aicw-msgs::-webkit-scrollbar{width:4px}
    #aicw-msgs::-webkit-scrollbar-thumb{background:#333;border-radius:2px}

    /* Empty */
    #aicw-empty{text-align:center;margin:auto;padding:40px 20px}
    #aicw-empty .ei{font-size:36px;margin-bottom:12px}
    #aicw-empty .et{font-size:14px;color:#666}
    #aicw-empty .es{font-size:12px;color:#444;margin-top:6px}

    /* User */
    .aicw-umsg{display:flex;justify-content:flex-end;margin-bottom:14px}
    .aicw-ububble{
      max-width:82%;background:rgba(212,160,23,.1);
      border:1px solid rgba(212,160,23,.2);border-radius:14px 14px 4px 14px;
      padding:10px 14px;color:#f0f0f0;font-size:14px;line-height:1.6;
      white-space:pre-wrap;word-break:break-word;
    }
    .aicw-uimgs{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;margin-bottom:6px}
    .aicw-uimg{width:72px;height:72px;object-fit:cover;border-radius:8px;border:1px solid rgba(255,255,255,.1)}

    /* Bot */
    .aicw-bmsg{margin-bottom:16px}

    /* Thinking */
    .aicw-think{
      background:#13100a;border:1px solid rgba(180,130,20,.25);
      border-radius:10px;margin-bottom:8px;overflow:hidden;
    }
    .aicw-think-hdr{
      display:flex;align-items:center;gap:7px;padding:9px 12px;
      cursor:pointer;user-select:none;background:none;border:none;width:100%;text-align:left;
    }
    .aicw-caret{font-size:11px;color:#6e5520;transition:transform .2s;display:inline-block;line-height:1}
    .aicw-caret.closed{transform:rotate(-90deg)}
    .aicw-think-label{font-size:12px;color:#b8944a;font-weight:500}
    .aicw-think-badge{
      font-size:10px;color:#6e5520;margin-left:auto;
      background:rgba(180,130,20,.1);border:1px solid rgba(180,130,20,.15);
      border-radius:4px;padding:1px 7px;
    }
    .aicw-think-body{
      padding:0 12px 12px;font-size:12px;color:#b8944a;line-height:1.7;
      font-family:monospace;white-space:pre-wrap;word-break:break-word;
      max-height:280px;overflow-y:auto;opacity:.85;
    }

    /* Tool call */
    .aicw-tool{
      background:#0b1520;border:1px solid rgba(60,120,200,.25);
      border-radius:10px;margin-bottom:8px;overflow:hidden;
    }
    .aicw-tool-hdr{
      display:flex;align-items:center;gap:8px;padding:9px 12px;
      cursor:pointer;user-select:none;background:none;border:none;width:100%;text-align:left;
    }
    .aicw-tool-icon{font-size:13px;color:#5ba0dc}
    .aicw-tool-name{font-size:13px;font-family:monospace;color:#5ba0dc;font-weight:500}
    .aicw-tool-provider{
      font-size:10px;color:rgba(91,160,220,.7);
      background:rgba(91,160,220,.08);border:1px solid rgba(91,160,220,.15);
      border-radius:4px;padding:1px 7px;
    }
    .aicw-tool-caret{font-size:11px;color:#2a4060;margin-left:auto;transition:transform .2s;display:inline-block}
    .aicw-tool-caret.closed{transform:rotate(-90deg)}
    .aicw-tool-body{padding:0 12px 12px}
    .aicw-tlabel{font-size:10px;color:#555;text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px}
    .aicw-tpre{
      background:#060e18;border:1px solid rgba(60,120,200,.25);border-radius:6px;
      padding:8px 10px;font-size:11px;color:#8ab8dc;overflow-x:auto;
      margin:0 0 10px;font-family:monospace;white-space:pre-wrap;word-break:break-word;
      max-height:180px;overflow-y:auto;line-height:1.5;
    }

    /* Bot text */
    .aicw-text{font-size:14px;color:#f0f0f0;line-height:1.7;white-space:pre-wrap;word-break:break-word}
    .aicw-text code{background:#1c1c1c;border:1px solid rgba(255,255,255,.1);border-radius:4px;padding:1px 5px;font-family:monospace;font-size:12px;color:#c8b870}
    .aicw-codeblock{
      background:#060a0f;border:1px solid rgba(255,255,255,.12);border-radius:8px;
      padding:10px 13px;font-size:12px;font-family:monospace;color:#a0c8e0;
      overflow-x:auto;margin:8px 0;white-space:pre;line-height:1.5;
    }
    .aicw-stats{margin-top:7px;font-size:11px;color:#3a3a3a;display:flex;gap:12px}

    /* Loading */
    .aicw-loading{
      background:#13100a;border:1px solid rgba(180,130,20,.25);border-radius:10px;
      padding:10px 14px;display:flex;align-items:center;gap:9px;margin-bottom:14px;
    }
    .aicw-dot{width:7px;height:7px;border-radius:50%;background:#b8944a;animation:aicw-pulse 1.2s infinite}
    .aicw-dot:nth-child(2){animation-delay:.2s}
    .aicw-dot:nth-child(3){animation-delay:.4s}
    @keyframes aicw-pulse{0%,80%,100%{opacity:.15}40%{opacity:1}}
    .aicw-ltext{font-size:13px;color:#b8944a}

    /* Error */
    .aicw-err{background:#140808;border:1px solid rgba(200,60,60,.25);border-radius:10px;padding:10px 14px;font-size:13px;color:#dc6060;margin-bottom:8px}

    /* Image previews */
    #aicw-previews{padding:8px 12px 0;display:none;gap:7px;flex-wrap:wrap;border-top:1px solid rgba(255,255,255,.07);flex-shrink:0}
    #aicw-previews.show{display:flex}
    .aicw-pw{position:relative}
    .aicw-pi{width:56px;height:56px;object-fit:cover;border-radius:7px;border:1px solid rgba(255,255,255,.1)}
    .aicw-prm{
      position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:50%;
      background:#2a2a2a;border:1px solid rgba(255,255,255,.15);color:#888;font-size:11px;
      cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1;
    }
    .aicw-prm:hover{background:#3a3a3a;color:#f0f0f0}

    /* Input */
    #aicw-inrow{padding:10px 12px;border-top:1px solid rgba(255,255,255,.07);display:flex;gap:8px;align-items:flex-end;flex-shrink:0;background:#161616}
    .aicw-ibtn{
      background:none;border:1px solid rgba(255,255,255,.1);border-radius:8px;
      width:36px;height:36px;cursor:pointer;color:#555;font-size:15px;
      display:flex;align-items:center;justify-content:center;flex-shrink:0;
      transition:border .15s,color .15s;
    }
    .aicw-ibtn:hover{border-color:rgba(255,255,255,.2);color:#f0f0f0}
    #aicw-ta{
      flex:1;background:#1f1f1f;border:1px solid rgba(255,255,255,.1);border-radius:10px;
      padding:9px 12px;color:#f0f0f0;font-size:14px;outline:none;resize:none;
      font-family:inherit;line-height:1.5;max-height:120px;overflow-y:auto;
      transition:border .15s;min-height:38px;
    }
    #aicw-ta:focus{border-color:rgba(212,160,23,.35)}
    #aicw-ta::placeholder{color:#3a3a3a}
    #aicw-send{
      background:#d4a017;border:none;border-radius:8px;width:36px;height:36px;
      cursor:pointer;color:#0d0d0d;font-size:17px;display:flex;align-items:center;
      justify-content:center;flex-shrink:0;font-weight:700;transition:opacity .15s,transform .15s;
    }
    #aicw-send:hover{opacity:.85}
    #aicw-send:active{transform:scale(.95)}
    #aicw-send:disabled{opacity:.3;cursor:not-allowed}
  `;

  /* ── DOM SETUP ─────────────────────────────────────────── */
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const root = document.getElementById('ai-chat') || document.body;
  root.innerHTML += `
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
          <input class="aicw-sinput" id="aicw-sapikey" type="text" value="${API_KEY}">
          <div class="aicw-slabel">Reasoning</div>
          <select class="aicw-sinput" id="aicw-sreasoning" style="cursor:pointer">
            <option value="on">on</option>
            <option value="medium" ${REASONING==='medium'?'selected':''}>Medium</option>
            <option value="high">High</option>
            <option value="off">off</option>
          </select>
        </div>
        <div id="aicw-msgs">
          <div id="aicw-empty">
            <div class="ei">♟</div>
            <div class="et">Ask anything</div>
            <div class="es">Powered by ${MODEL.split('/').pop()} · web search enabled</div>
          </div>
        </div>
        <div id="aicw-previews"></div>
        <div id="aicw-inrow">
          <input type="file" id="aicw-filein" accept="image/*" multiple style="display:none">
          <button class="aicw-ibtn" id="aicw-attachbtn" title="Attach image">🖼</button>
          <textarea id="aicw-ta" rows="1" placeholder="Ask anything… paste images too"></textarea>
          <button id="aicw-send">↑</button>
        </div>
      </div>
      <button id="aicw-bubble">♟</button>
    </div>
  `;

  /* ── STATE ───────────────────────────────────────────── */
  let panelOpen = false, settingsOpen = false, loading = false;
  let prevResponseId = null, attachedImgs = [], msgIdx = 0, loadTimer = null;
  const collapsed = {};

  /* ── REFS ────────────────────────────────────────────── */
  const panel   = document.getElementById('aicw-panel');
  const bubble  = document.getElementById('aicw-bubble');
  const msgs    = document.getElementById('aicw-msgs');
  const ta      = document.getElementById('aicw-ta');
  const sendBtn = document.getElementById('aicw-send');
  const previews= document.getElementById('aicw-previews');

  const cfg = () => ({
    url:       document.getElementById('aicw-surl').value.trim().replace(/\/+$/, ''),
    model:     document.getElementById('aicw-smodel').value.trim(),
    apiKey:    document.getElementById('aicw-sapikey').value.trim(),
    reasoning: document.getElementById('aicw-sreasoning').value,
  });

  /* ── PANEL CONTROLS ──────────────────────────────────── */
  bubble.onclick = () => { panelOpen = !panelOpen; panel.classList.toggle('open', panelOpen); bubble.textContent = panelOpen ? '✕' : '♟'; };
  document.getElementById('aicw-closebtn').onclick = () => { panelOpen = false; panel.classList.remove('open'); bubble.textContent = '♟'; };
  document.getElementById('aicw-settingsbtn').onclick = () => { settingsOpen = !settingsOpen; document.getElementById('aicw-settings').classList.toggle('open', settingsOpen); };
  document.getElementById('aicw-smodel').oninput = e => { document.getElementById('aicw-modelsub').textContent = e.target.value.split('/').pop() + ' · local'; };

  document.getElementById('aicw-resetbtn').onclick = () => {
    if (!confirm('Start a new conversation?')) return;
    prevResponseId = null; attachedImgs = []; msgIdx = 0; collapsed = {};
    msgs.innerHTML = `<div id="aicw-empty"><div class="ei">♟</div><div class="et">Ask anything</div><div class="es">Powered by ${cfg().model.split('/').pop()} · web search enabled</div></div>`;
    updatePreviews();
  };

  /* ── FILE / IMAGE ────────────────────────────────────── */
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

  /* ── TEXTAREA ────────────────────────────────────────── */
  ta.addEventListener('paste', e => {
    for (const item of e.clipboardData.items) {
      if (item.type.startsWith('image/')) readFile(item.getAsFile());
    }
  });
  ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'; });
  ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); } });
  sendBtn.onclick = sendMsg;

  /* ── COLLAPSE ────────────────────────────────────────── */
  window.__aicwToggle = key => {
    collapsed[key] = !collapsed[key];
    document.querySelectorAll(`[data-aicw-caret="${key}"]`).forEach(el => el.classList.toggle('closed', !!collapsed[key]));
    document.querySelectorAll(`[data-aicw-body="${key}"]`).forEach(el => el.style.display = collapsed[key] ? 'none' : '');
  };

  /* ── HELPERS ─────────────────────────────────────────── */
  function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function renderMd(text) {
    // Code blocks
    text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
      `\x00CODEBLOCK\x00${esc(code.trim())}\x00ENDCODEBLOCK\x00`);
    // Escape rest
    let html = esc(text);
    // Restore code blocks
    html = html.replace(/\x00CODEBLOCK\x00([\s\S]*?)\x00ENDCODEBLOCK\x00/g, (_, code) =>
      `<div class="aicw-codeblock">${code}</div>`);
    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Bold / italic
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    // Newlines
    html = html.replace(/\n/g, '<br>');
    return html;
  }

  function scrollBottom() { msgs.scrollTop = msgs.scrollHeight; }

  /* ── MESSAGE RENDERERS ───────────────────────────────── */
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

  function showLoading() {
    const div = document.createElement('div');
    div.id = 'aicw-loading';
    div.className = 'aicw-loading';
    div.innerHTML = `<div class="aicw-dot"></div><div class="aicw-dot"></div><div class="aicw-dot"></div><span class="aicw-ltext" id="aicw-ltext">Thinking</span>`;
    msgs.appendChild(div);
    let dots = 0;
    loadTimer = setInterval(() => {
      dots = (dots + 1) % 4;
      const lt = document.getElementById('aicw-ltext');
      if (lt) lt.textContent = 'Thinking' + '.'.repeat(dots);
    }, 400);
    scrollBottom();
  }

  function hideLoading() {
    clearInterval(loadTimer);
    const el = document.getElementById('aicw-loading');
    if (el) el.remove();
  }

  function addBotMsg(data) {
    const idx = msgIdx++;
    const output = data.output || [];
    let reasoning = null, messageText = '', toolCalls = [];

    for (const item of output) {
      if (item.type === 'reasoning') reasoning = item.content;
      else if (item.type === 'message') messageText = item.content;
      else if (item.type === 'tool_call') toolCalls.push(item);
    }

    const stats = data.stats || {};
    const div = document.createElement('div');
    div.className = 'aicw-bmsg';
    let html = '';

    // Thinking
    if (reasoning) {
      const key = `think-${idx}`;
      const timeStr = stats.time_to_first_token_seconds != null
        ? `Thought for ${stats.time_to_first_token_seconds.toFixed(2)}s` : 'Thought';
      const badge = stats.reasoning_output_tokens > 0
        ? `<span class="aicw-think-badge">${stats.reasoning_output_tokens} tokens</span>` : '';
      html += `<div class="aicw-think">
        <button class="aicw-think-hdr" onclick="__aicwToggle('${key}')">
          <span class="aicw-caret" data-aicw-caret="${key}">▾</span>
          <span class="aicw-think-label">${esc(timeStr)}</span>${badge}
        </button>
        <div class="aicw-think-body" data-aicw-body="${key}">${esc(reasoning)}</div>
      </div>`;
    }

    // Tool calls
    toolCalls.forEach((tc, j) => {
      const key = `tool-${idx}-${j}`;
      const provider = tc.provider_info?.plugin_id || tc.provider_info?.server_label || '';
      const provBadge = provider ? `<span class="aicw-tool-provider">${esc(provider)}</span>` : '';
      const argsStr = JSON.stringify(tc.arguments, null, 2);
      const resultStr = typeof tc.output === 'string' ? tc.output : JSON.stringify(tc.output, null, 2);
      const truncResult = resultStr.length > 2000 ? resultStr.slice(0, 2000) + '\n…(truncated)' : resultStr;
      html += `<div class="aicw-tool">
        <button class="aicw-tool-hdr" onclick="__aicwToggle('${key}')">
          <span class="aicw-tool-icon">⚙</span>
          <span class="aicw-tool-name">${esc(tc.tool)}</span>
          ${provBadge}
          <span class="aicw-tool-caret" data-aicw-caret="${key}">▾</span>
        </button>
        <div class="aicw-tool-body" data-aicw-body="${key}">
          <div class="aicw-tlabel">Arguments</div>
          <pre class="aicw-tpre">${esc(argsStr)}</pre>
          ${resultStr ? `<div class="aicw-tlabel">Result</div><pre class="aicw-tpre">${esc(truncResult)}</pre>` : ''}
        </div>
      </div>`;
    });

    // Fallback
    if (!messageText && !reasoning && !toolCalls.length) {
      html += `<div class="aicw-err">No response. Is LM Studio running and the tunnel active?</div>`;
    }

    // Message text
    if (messageText) {
      html += `<div class="aicw-text">${renderMd(messageText)}</div>`;
    }

    // Stats
    const toks = stats.total_output_tokens || 0;
    const tps  = stats.tokens_per_second > 0 ? ` · ${stats.tokens_per_second.toFixed(1)} tok/s` : '';
    if (toks) html += `<div class="aicw-stats"><span>${toks} tokens${tps}</span></div>`;

    div.innerHTML = html;
    msgs.appendChild(div);
    scrollBottom();
  }

  function addErrMsg(text) {
    const div = document.createElement('div');
    div.className = 'aicw-bmsg';
    div.innerHTML = `<div class="aicw-err"><strong>Error:</strong> ${esc(text)}</div>`;
    msgs.appendChild(div);
    scrollBottom();
  }

  /* ── SEND ────────────────────────────────────────────── */
  async function sendMsg() {
    const text = ta.value.trim();
    if (!text && !attachedImgs.length) return;
    if (loading) return;

    const imgs = [...attachedImgs];
    attachedImgs = []; updatePreviews();
    ta.value = ''; ta.style.height = 'auto';
    addUserMsg(text, imgs);
    loading = true; sendBtn.disabled = true;
    showLoading();

    const c = cfg();

    // Build input
    const inputArr = [];
    if (text) inputArr.push({ type: 'text', content: text });
    for (const img of imgs) inputArr.push({ type: 'image', data_url: img.url });
    const inputVal = inputArr.length === 1 && inputArr[0].type === 'text' ? text : inputArr;

    const body = {
      model:        c.model,
      input:        inputVal,
      context_length: CONTEXT_LEN,
      temperature:  0.6,
      reasoning:    c.reasoning,
      store:        true,
    };
    if (MCP_PLUGIN) body.integrations = [{ type: 'plugin', id: MCP_PLUGIN }];
    if (prevResponseId) body.previous_response_id = prevResponseId;

    try {
      const res = await fetch(`${c.url}/api/v1/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${c.apiKey}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const t = await res.text(); throw new Error(`HTTP ${res.status} — ${t.slice(0,300)}`); }
      const data = await res.json();
      if (data.response_id) prevResponseId = data.response_id;
      hideLoading();
      addBotMsg(data);
    } catch (e) {
      hideLoading();
      addErrMsg(e.message);
    } finally {
      loading = false; sendBtn.disabled = false;
    }
  }

})();