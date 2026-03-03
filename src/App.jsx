import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import * as mammoth from "mammoth";

/* ═══════════════════════════════════════════════════════════════
   PAPERWRAPPED v3 — Visual Feedback Machine
   Editable categories · Flexible scoring · Paper→Zoom greatest hits
   ═══════════════════════════════════════════════════════════════ */

const DEFAULT_CATEGORIES = [
  { id: "cat1", name: "Thesis & Argument", icon: "🎯", color: "#E8115B", maxScore: 10 },
  { id: "cat2", name: "Evidence & Support", icon: "📚", color: "#1DB954", maxScore: 10 },
  { id: "cat3", name: "Analysis & Depth", icon: "🔬", color: "#509BF5", maxScore: 10 },
  { id: "cat4", name: "Voice & Style", icon: "✍️", color: "#F573A0", maxScore: 10 },
];

const EXTRA_CATS = [
  { name: "Organization", icon: "🏗️", color: "#FF6437" },
  { name: "Grammar & Mechanics", icon: "⚙️", color: "#8C67AB" },
  { name: "Creativity", icon: "💡", color: "#FFD700" },
  { name: "Transitions", icon: "🔗", color: "#4ECDC4" },
  { name: "Historical Accuracy", icon: "📜", color: "#CD7F32" },
  { name: "Use of Sources", icon: "🔖", color: "#20B2AA" },
  { name: "Counterargument", icon: "⚖️", color: "#DC143C" },
  { name: "Vocabulary", icon: "📖", color: "#9370DB" },
];

const COLOR_OPTIONS = [
  "#E8115B", "#1DB954", "#509BF5", "#F573A0", "#FF6437",
  "#8C67AB", "#FFD700", "#4ECDC4", "#CD7F32", "#20B2AA",
  "#DC143C", "#9370DB", "#FF69B4", "#00CED1", "#FF4500",
];

const ICON_OPTIONS = ["🎯", "📚", "🔬", "✍️", "🏗️", "⚙️", "💡", "🔗", "📜", "🔖", "⚖️", "📖", "🧠", "💬", "🎨", "🔥", "⭐", "🌟", "📝", "🎭"];

const ANNOTATION_TYPES = [
  { id: "strength", label: "Strength", emoji: "💪", color: "#1DB954" },
  { id: "growth", label: "Needs Work", emoji: "🌱", color: "#FF6437" },
  { id: "greatestHit", label: "Greatest Hit", emoji: "🏆", color: "#FFD700" },
];

const SLIDE_BGS = [
  "linear-gradient(135deg, #191414 0%, #1a1a2e 100%)",
  "linear-gradient(150deg, #0d1b2a 0%, #162447 50%, #1f4068 100%)",
  "linear-gradient(135deg, #1a0a2e 0%, #3d1a78 50%, #E8115B 100%)",
  "linear-gradient(135deg, #001510 0%, #003d2b 50%, #1DB954 100%)",
  "linear-gradient(135deg, #0a1628 0%, #1a3a6b 50%, #509BF5 100%)",
  "linear-gradient(135deg, #2d1500 0%, #8b4000 50%, #FF6437 100%)",
  "linear-gradient(135deg, #1a0d22 0%, #4a2068 50%, #8C67AB 100%)",
  "linear-gradient(135deg, #1a1a00 0%, #6b6b00 50%, #FFD700 100%)",
  "linear-gradient(135deg, #001a1a 0%, #006b5a 50%, #4ECDC4 100%)",
  "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
  "linear-gradient(135deg, #191414 0%, #2d1b33 50%, #F573A0 100%)",
  "linear-gradient(135deg, #1a0000 0%, #6b1020 50%, #E8115B 100%)",
];

// ─── GLOBAL SETUP ─────────────────────────────────────────────
// Load fonts (guarded against duplicate injection)
if (!document.querySelector('link[href*="Outfit"]')) {
  const fl = document.createElement("link");
  fl.href = "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&family=Crimson+Pro:ital,wght@0,400;0,600;1,400&display=swap";
  fl.rel = "stylesheet"; document.head.appendChild(fl);
}

// ─── MINIMAL ZIP PARSER (no external deps) ────────────────────
async function parseDocxComments(arrayBuffer) {
  const buf = new Uint8Array(arrayBuffer);
  const view = new DataView(arrayBuffer);

  // Find End of Central Directory record (search from end)
  let eocdOffset = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (view.getUint32(i, true) === 0x06054b50) { eocdOffset = i; break; }
  }
  if (eocdOffset === -1) return { comments: [], error: "Not a valid ZIP/DOCX file" };

  const cdOffset = view.getUint32(eocdOffset + 16, true);
  const cdCount = view.getUint16(eocdOffset + 10, true);

  // Read Central Directory entries
  const files = {};
  let pos = cdOffset;
  for (let i = 0; i < cdCount; i++) {
    if (view.getUint32(pos, true) !== 0x02014b50) break;
    const method = view.getUint16(pos + 10, true);
    const compSize = view.getUint32(pos + 20, true);
    const uncompSize = view.getUint32(pos + 24, true);
    const nameLen = view.getUint16(pos + 28, true);
    const extraLen = view.getUint16(pos + 30, true);
    const commentLen = view.getUint16(pos + 32, true);
    const localOffset = view.getUint32(pos + 42, true);
    const name = new TextDecoder().decode(buf.slice(pos + 46, pos + 46 + nameLen));
    files[name] = { method, compSize, uncompSize, localOffset };
    pos += 46 + nameLen + extraLen + commentLen;
  }

  // Extract a file from the ZIP
  const extractFile = async (name) => {
    const entry = files[name];
    if (!entry) return null;
    const lh = entry.localOffset;
    if (view.getUint32(lh, true) !== 0x04034b50) return null;
    const lhNameLen = view.getUint16(lh + 26, true);
    const lhExtraLen = view.getUint16(lh + 28, true);
    const dataStart = lh + 30 + lhNameLen + lhExtraLen;
    const compressed = buf.slice(dataStart, dataStart + entry.compSize);

    if (entry.method === 0) {
      // Stored (no compression)
      return new TextDecoder().decode(compressed);
    } else if (entry.method === 8) {
      // Deflate — use browser DecompressionStream
      try {
        const ds = new DecompressionStream("deflate-raw");
        const writer = ds.writable.getWriter();
        writer.write(compressed);
        writer.close();
        const reader = ds.readable.getReader();
        const chunks = [];
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
        const total = chunks.reduce((s, c) => s + c.length, 0);
        const result = new Uint8Array(total);
        let offset = 0;
        for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
        return new TextDecoder().decode(result);
      } catch (e) {
        console.error("Decompress error for", name, e);
        return null;
      }
    }
    return null;
  };

  // Extract comments and document XML
  const commentsStr = await extractFile("word/comments.xml");
  const documentStr = await extractFile("word/document.xml");

  const extractedComments = [];

  if (commentsStr) {
    const parser = new DOMParser();
    const commentsDoc = parser.parseFromString(commentsStr, "application/xml");
    const commentMap = {};

    // Parse comment bodies — handle both prefixed and unprefixed tag names
    const commentNodes = commentsDoc.querySelectorAll("comment") || [];
    // Also try getElementsByTagName with namespace prefix
    const wComments = commentsDoc.getElementsByTagName("w:comment");
    const allComments = wComments.length > 0 ? wComments : commentNodes;

    for (let i = 0; i < allComments.length; i++) {
      const node = allComments[i];
      const id = node.getAttribute("w:id") || node.getAttribute("id");
      const author = node.getAttribute("w:author") || node.getAttribute("author") || "";
      // Collect all text content from w:t or t elements
      let text = "";
      const tNodes = node.getElementsByTagName("w:t");
      if (tNodes.length > 0) {
        for (let j = 0; j < tNodes.length; j++) text += tNodes[j].textContent;
      } else {
        // Fallback: just grab all text content
        text = node.textContent || "";
      }
      if (id && text.trim()) {
        commentMap[id] = { text: text.trim(), author };
      }
    }

    // Parse document.xml to find which text each comment is attached to
    if (documentStr && Object.keys(commentMap).length > 0) {
      const docDoc = parser.parseFromString(documentStr, "application/xml");
      const body = docDoc.getElementsByTagName("w:body")[0] || docDoc.querySelector("body");

      if (body) {
        const openComments = new Set();
        const commentTexts = {};

        const walkNode = (node) => {
          const name = node.nodeName || "";
          if (name === "w:commentRangeStart" || name === "commentRangeStart") {
            const id = node.getAttribute("w:id") || node.getAttribute("id");
            if (id && commentMap[id]) {
              openComments.add(id);
              if (!commentTexts[id]) commentTexts[id] = "";
            }
          }
          if (name === "w:commentRangeEnd" || name === "commentRangeEnd") {
            const id = node.getAttribute("w:id") || node.getAttribute("id");
            openComments.delete(id);
          }
          if (name === "w:t" || name === "t") {
            const t = node.textContent || "";
            for (const cid of openComments) {
              commentTexts[cid] = (commentTexts[cid] || "") + t;
            }
          }
          for (const child of node.childNodes) walkNode(child);
        };
        walkNode(body);

        for (const [id, comment] of Object.entries(commentMap)) {
          extractedComments.push({
            comment: comment.text,
            author: comment.author,
            passage: commentTexts[id]?.trim() || "",
          });
        }
      }
    } else {
      // No document.xml or no matches — just return comments without passages
      for (const [id, comment] of Object.entries(commentMap)) {
        extractedComments.push({ comment: comment.text, author: comment.author, passage: "" });
      }
    }
  }

  return {
    comments: extractedComments,
    fileList: Object.keys(files),
    error: null,
  };
}

if (!document.querySelector('style[data-pw]')) {
const gs = document.createElement("style");
gs.setAttribute("data-pw", "1");
gs.textContent = `
  @keyframes fadeInUp{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes scaleIn{from{opacity:0;transform:scale(0.85)}to{opacity:1;transform:scale(1)}}
  @keyframes zoomIn{from{opacity:0;transform:scale(0.6)}to{opacity:1;transform:scale(1)}}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes glowReveal{0%{background-color:transparent;border-bottom-color:transparent}100%{background-color:var(--hl-bg);border-bottom-color:var(--hl-color)}}
  .af{animation:fadeInUp .6s ease forwards}.afi{animation:fadeIn .5s ease forwards}
  .asi{animation:scaleIn .5s ease forwards}.azi{animation:zoomIn .6s cubic-bezier(0.16,1,0.3,1) forwards}
  .s1{animation-delay:.1s;opacity:0}.s2{animation-delay:.2s;opacity:0}.s3{animation-delay:.3s;opacity:0}
  .s4{animation-delay:.4s;opacity:0}.s5{animation-delay:.5s;opacity:0}.s6{animation-delay:.6s;opacity:0}
  .s7{animation-delay:.7s;opacity:0}.s8{animation-delay:.8s;opacity:0}.s9{animation-delay:.9s;opacity:0}
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Outfit',sans-serif;background:#0a0a0a;overflow-x:hidden}
  ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}
  ::-webkit-scrollbar-thumb{background:#333;border-radius:3px}
  textarea:focus,input:focus{outline:none}::selection{background:rgba(29,185,84,0.3)}
  input[type="number"]::-webkit-inner-spin-button{opacity:1}
`;
document.head.appendChild(gs);
}

// ─── UTILITIES ────────────────────────────────────────────────
function splitWords(text) {
  const r = []; const rx = /(\S+)(\s*)/g; let m;
  while ((m = rx.exec(text)) !== null) r.push({ word: m[1], space: m[2], index: r.length });
  return r;
}
function computeStats(text) {
  const w = text.trim().split(/\s+/).filter(Boolean);
  const s = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
  const p = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  const u = new Set(w.map(x => x.toLowerCase().replace(/[^a-z']/g, "")));
  return { wordCount: w.length, sentenceCount: s.length, paragraphCount: p.length,
    avgSentLen: s.length ? Math.round(w.length / s.length) : 0, uniqueWords: u.size };
}
function AnimNum({ value, delay = 0 }) {
  const [d, setD] = useState(0);
  useEffect(() => {
    let iv = null;
    const t = setTimeout(() => {
      let c = 0; const step = Math.max(1, Math.floor(value / 35));
      iv = setInterval(() => { c += step; if (c >= value) { setD(value); clearInterval(iv); iv = null; } else setD(c); }, 25);
    }, delay);
    return () => { clearTimeout(t); if (iv) clearInterval(iv); };
  }, [value, delay]);
  return <span>{d.toLocaleString()}</span>;
}
let _id = 0;
const uid = () => "c" + (++_id) + "_" + Math.random().toString(36).slice(2, 6);

// ─── CLIENT-SIDE QR CODE GENERATOR ───────────────────────────
// Minimal QR: Version 4, ECC-L, Byte mode (URLs up to 78 chars)
const QR_SIZE = 33;
const qrGF = (() => {
  const E = new Uint8Array(256), L = new Uint8Array(256); let v = 1;
  for (let i = 0; i < 255; i++) { E[i] = v; L[v] = i; v = v < 128 ? v << 1 : (v << 1) ^ 285; } E[255] = E[0];
  return { E, L, mul: (a, b) => a && b ? E[(L[a] + L[b]) % 255] : 0 };
})();
function qrECC(data, eccLen) {
  const { E, L, mul } = qrGF;
  // Build generator polynomial
  let gen = [1];
  for (let i = 0; i < eccLen; i++) {
    const ng = new Array(gen.length + 1).fill(0);
    for (let j = 0; j < gen.length; j++) { ng[j] ^= gen[j]; ng[j + 1] ^= mul(gen[j], E[i]); }
    gen = ng;
  }
  const msg = new Uint8Array(data.length + eccLen);
  msg.set(data);
  for (let i = 0; i < data.length; i++) {
    const coef = msg[i]; if (!coef) continue;
    for (let j = 0; j < gen.length; j++) msg[i + j] ^= mul(gen[j], coef);
  }
  return msg.slice(data.length);
}
function makeQRMatrix(text) {
  const bytes = new TextEncoder().encode(text);
  if (bytes.length > 78) return null; // too long for v4-L
  // Encode data: mode(4) + count(8) + data + terminator + padding
  let bits = "0100" + bytes.length.toString(2).padStart(8, "0");
  for (const b of bytes) bits += b.toString(2).padStart(8, "0");
  bits += "0000"; // terminator
  while (bits.length % 8) bits += "0";
  const codewords = [];
  for (let i = 0; i < bits.length; i += 8) codewords.push(parseInt(bits.slice(i, i + 8), 2));
  const pads = [0xEC, 0x11]; let pi = 0;
  while (codewords.length < 80) codewords.push(pads[pi++ % 2]);
  // ECC
  const ecc = qrECC(new Uint8Array(codewords), 20);
  const allData = [...codewords, ...ecc];
  // Build matrix
  const m = Array.from({ length: QR_SIZE }, () => new Uint8Array(QR_SIZE));
  const used = Array.from({ length: QR_SIZE }, () => new Uint8Array(QR_SIZE));
  const set = (r, c, v) => { if (r >= 0 && r < QR_SIZE && c >= 0 && c < QR_SIZE) { m[r][c] = v ? 1 : 0; used[r][c] = 1; } };
  // Finder patterns
  const finder = (r, c) => {
    for (let dr = -1; dr <= 7; dr++) for (let dc = -1; dc <= 7; dc++) {
      const inside = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
      const ring = dr === 0 || dr === 6 || dc === 0 || dc === 6;
      const core = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
      set(r + dr, c + dc, inside && (ring || core));
    }
  };
  finder(0, 0); finder(0, QR_SIZE - 7); finder(QR_SIZE - 7, 0);
  // Alignment pattern at (26,26) for v4
  for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++)
    set(26 + dr, 26 + dc, Math.abs(dr) === 2 || Math.abs(dc) === 2 || (dr === 0 && dc === 0));
  // Timing
  for (let i = 8; i < QR_SIZE - 8; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
  // Dark module + reserved format areas
  set(QR_SIZE - 8, 8, 1);
  for (let i = 0; i < 8; i++) { set(8, i, 0); set(8, QR_SIZE - 1 - i, 0); set(i, 8, 0); set(QR_SIZE - 1 - i, 8, 0); }
  set(8, 8, 0);
  // Version info not needed for v4
  // Place data bits (upward zigzag, right to left, skip column 6)
  let bitIdx = 0;
  const dataBits = allData.flatMap(b => Array.from({ length: 8 }, (_, i) => (b >> (7 - i)) & 1));
  for (let col = QR_SIZE - 1; col >= 0; col -= 2) {
    if (col === 6) col = 5; // skip timing column
    for (let row = 0; row < QR_SIZE; row++) {
      for (let dc = 0; dc <= 1; dc++) {
        const c = col - dc;
        const r = ((Math.floor((QR_SIZE - 1 - col + (col < 6 ? 1 : 0)) / 2)) % 2 === 0) ? QR_SIZE - 1 - row : row;
        if (c >= 0 && c < QR_SIZE && r >= 0 && r < QR_SIZE && !used[r][c]) {
          const bit = bitIdx < dataBits.length ? dataBits[bitIdx++] : 0;
          m[r][c] = bit ^ ((r + c) % 2 === 0 ? 1 : 0); // mask 0
          used[r][c] = 1;
        }
      }
    }
  }
  // Format info for mask 0, ECC-L = 0b111011111000100
  const fmt = 0b111011111000100;
  for (let i = 0; i < 6; i++) set(8, i, (fmt >> (14 - i)) & 1);
  set(8, 7, (fmt >> 8) & 1); set(8, 8, (fmt >> 7) & 1); set(7, 8, (fmt >> 6) & 1);
  for (let i = 0; i < 6; i++) set(5 - i, 8, (fmt >> (5 - i)) & 1);
  for (let i = 0; i < 7; i++) set(QR_SIZE - 1 - i, 8, (fmt >> (14 - i)) & 1);
  for (let i = 0; i < 8; i++) set(8, QR_SIZE - 8 + i, (fmt >> (7 - i)) & 1);
  return m;
}
function QRCodeSVG({ text, size = 200, fg = "#1DB954", bg = "#0f0f13" }) {
  const matrix = useMemo(() => makeQRMatrix(text), [text]);
  if (!matrix) return <div style={{ width: size, height: size, background: bg, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#555" }}>URL too long for QR</div>;
  const cellSize = size / (QR_SIZE + 2); // +2 for quiet zone
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <rect width={size} height={size} fill={bg} />
      {matrix.flatMap((row, r) => row.map((cell, c) =>
        cell ? <rect key={`${r}-${c}`} x={(c + 1) * cellSize} y={(r + 1) * cellSize} width={cellSize + 0.5} height={cellSize + 0.5} fill={fg} /> : null
      ))}
    </svg>
  );
}

// ─── CATEGORY EDITOR ──────────────────────────────────────────
function CategoryEditor({ categories, setCategories }) {
  const [editingId, setEditingId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

  const updateCat = (id, field, value) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };
  const removeCat = (id) => setCategories(prev => prev.filter(c => c.id !== id));
  const addCat = (template) => {
    setCategories(prev => [...prev, { id: uid(), name: template?.name || "New Category", icon: template?.icon || "⭐", color: template?.color || "#509BF5", maxScore: 10 }]);
    setShowAdd(false);
  };
  const addBlank = () => addCat(null);

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {categories.map(cat => {
          const editing = editingId === cat.id;
          return (
            <div key={cat.id} style={{
              padding: editing ? "16px 18px" : "12px 16px", borderRadius: 14,
              border: `2px solid ${editing ? cat.color : "#222230"}`,
              background: editing ? `${cat.color}08` : "#16161d",
              transition: "all 0.2s",
            }}>
              {/* Compact view */}
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 22, cursor: "pointer" }} onClick={() => setEditingId(editing ? null : cat.id)}>{cat.icon}</span>
                <div style={{ flex: 1 }}>
                  {editing ? (
                    <input value={cat.name} onChange={e => updateCat(cat.id, "name", e.target.value)}
                      style={{ ...inp, padding: "6px 10px", fontSize: 15, fontWeight: 700, background: "rgba(255,255,255,0.05)", border: "1px solid #333" }} autoFocus />
                  ) : (
                    <span style={{ fontWeight: 700, color: "#fff", fontSize: 14, cursor: "pointer" }} onClick={() => setEditingId(cat.id)}>{cat.name}</span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, color: "#666" }}>out of</span>
                  <input type="number" value={cat.maxScore} min={1} max={1000}
                    onChange={e => updateCat(cat.id, "maxScore", Math.max(1, parseInt(e.target.value) || 1))}
                    style={{ width: 60, padding: "5px 8px", borderRadius: 8, border: "1px solid #333", background: "#0f0f13", color: "#fff", fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono'", textAlign: "center" }}
                  />
                  <button onClick={() => setEditingId(editing ? null : cat.id)} style={{
                    background: "none", border: "none", color: editing ? cat.color : "#555", cursor: "pointer", fontSize: 14, padding: "4px 6px",
                  }}>{editing ? "▲" : "▼"}</button>
                </div>
              </div>
              {/* Expanded edit */}
              {editing && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #222230" }}>
                  <div style={{ marginBottom: 10 }}>
                    <label style={lbl}>Icon</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {ICON_OPTIONS.map(ic => (
                        <button key={ic} onClick={() => updateCat(cat.id, "icon", ic)} style={{
                          width: 32, height: 32, borderRadius: 8, border: `2px solid ${cat.icon === ic ? cat.color : "#222"}`,
                          background: cat.icon === ic ? `${cat.color}20` : "#0f0f13",
                          fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                        }}>{ic}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <label style={lbl}>Color</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {COLOR_OPTIONS.map(c => (
                        <button key={c} onClick={() => updateCat(cat.id, "color", c)} style={{
                          width: 28, height: 28, borderRadius: "50%", border: `3px solid ${cat.color === c ? "#fff" : "transparent"}`,
                          background: c, cursor: "pointer",
                        }} />
                      ))}
                    </div>
                  </div>
                  <button onClick={() => removeCat(cat.id)} style={{
                    padding: "6px 14px", borderRadius: 8, border: "1px solid #E8115B30",
                    background: "#E8115B10", color: "#E8115B", fontSize: 12, fontWeight: 700,
                    cursor: "pointer", fontFamily: "'Outfit'",
                  }}>Remove Category</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add category */}
      <div style={{ marginTop: 12 }}>
        {!showAdd ? (
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={addBlank} style={{
              padding: "10px 18px", borderRadius: 10, border: "2px dashed #333",
              background: "transparent", color: "#666", fontSize: 13, fontWeight: 600,
              cursor: "pointer", fontFamily: "'Outfit'", flex: 1,
            }}>+ Add Custom Category</button>
            <button onClick={() => setShowAdd(true)} style={{
              padding: "10px 18px", borderRadius: 10, border: "2px dashed #333",
              background: "transparent", color: "#666", fontSize: 13, fontWeight: 600,
              cursor: "pointer", fontFamily: "'Outfit'",
            }}>Browse Templates</button>
          </div>
        ) : (
          <div style={{ background: "#13131a", borderRadius: 14, border: "1px solid #222230", padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#888" }}>Quick Add</span>
              <button onClick={() => setShowAdd(false)} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 16 }}>×</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {EXTRA_CATS.filter(ec => !categories.some(c => c.name === ec.name)).map(ec => (
                <button key={ec.name} onClick={() => addCat(ec)} style={{
                  padding: "8px 12px", borderRadius: 10, border: "1px solid #222230",
                  background: "#16161d", color: "#ccc", fontSize: 12, fontWeight: 600,
                  cursor: "pointer", fontFamily: "'Outfit'", textAlign: "left",
                  display: "flex", alignItems: "center", gap: 8, transition: "border-color 0.15s",
                }}><span style={{ fontSize: 16 }}>{ec.icon}</span>{ec.name}</button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── QUICK COMMENT CHIPS ──────────────────────────────────────
const QUICK_COMMENTS = {
  strength: {
    _default: ["Strong move here.", "This is exactly the kind of thinking that elevates a paper.", "Love this — keep this energy."],
    "thesis": ["Clear, arguable claim. This drives your whole paper.", "Strong thesis — specific and debatable.", "Your argument is focused and compelling here."],
    "evidence": ["Well-chosen evidence that directly supports your point.", "Great quote selection — it does real work.", "This detail makes your argument concrete."],
    "analysis": ["You're not just summarizing — you're thinking. More of this.", "This is genuine insight. Push every paragraph to this level.", "Excellent close reading here."],
    "voice": ["Your voice is distinctive here. Don't lose it.", "This sounds like you — authentic and confident.", "Great stylistic choice. It lands."],
    "organization": ["Smooth transition — the logic flows naturally.", "This paragraph is well-structured.", "Good sequencing of ideas here."],
    "grammar": ["Clean, precise prose.", "Sentence structure works well here.", "Good mechanics throughout this section."],
    "creativity": ["Unexpected move — and it works.", "This is original thinking.", "Love the creative risk here."],
    "transitions": ["Seamless connection between ideas.", "This bridges your paragraphs perfectly.", "The flow here is natural."],
  },
  growth: {
    _default: ["This needs more development.", "Push deeper here — what's the 'so what?'", "Revisit this section with fresh eyes."],
    "thesis": ["Your claim is too broad — narrow it down to something arguable.", "What specifically are you arguing? Make it precise.", "This reads more like a topic than an argument."],
    "evidence": ["You make a claim here — now anchor it with a specific quote.", "Where's the evidence? Add a detail from the text.", "The evidence is there but it's not doing work yet. Explain it."],
    "analysis": ["You're summarizing here. What do you think this means?", "Go one level deeper — why does this matter?", "Don't just tell me what happened. Tell me what it means."],
    "voice": ["This section feels generic. Bring back the voice from your intro.", "Who's writing this — you, or a textbook? Make it yours.", "Loosen up here — your best writing sounds like you."],
    "organization": ["This feels out of place. Where should it actually go?", "The jump between these ideas is jarring — add a bridge.", "Consider reordering — lead with your strongest point."],
    "grammar": ["Read this sentence out loud — you'll hear the issue.", "Fragment or run-on here. Break it up or connect it.", "Check punctuation in this section."],
    "creativity": ["This is safe. What's a riskier, more interesting move?", "I've read this take before — what's yours?", "Push past the obvious reading here."],
    "transitions": ["Abrupt shift — the reader needs a bridge.", "These ideas connect, but you haven't shown how yet.", "Add a sentence that links this to what came before."],
  },
  greatestHit: {
    _default: ["This is your best moment in the paper.", "If the whole essay were at this level, it'd be remarkable.", "This is the standard to hold yourself to."],
  },
};

function getQuickChips(type, catName, savedComments) {
  const catKey = catName?.toLowerCase().split(/[^a-z]/)[0] || "_default";
  const typeBank = QUICK_COMMENTS[type] || QUICK_COMMENTS.strength;
  const contextual = typeBank[catKey] || typeBank._default;
  
  // Saved comments for this type go first, then contextual
  const saved = (savedComments || []).filter(sc => sc.type === type);
  const savedTexts = saved.map(s => s.text);
  const remaining = contextual.filter(c => !savedTexts.includes(c));
  
  // Show up to 3: saved first, then fill with contextual
  return [...savedTexts.slice(0, 2), ...remaining].slice(0, 3);
}

// ─── ANNOTATION POPOVER ───────────────────────────────────────
function AnnotationPopover({ position, categories, onSubmit, onClose, savedComments, onSaveComment }) {
  const [type, setType] = useState("strength");
  const [catId, setCatId] = useState(categories[0]?.id || "");
  const [comment, setComment] = useState("");
  const ref = useRef(null);
  useEffect(() => { const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); }; setTimeout(() => document.addEventListener("mousedown", h), 50); return () => document.removeEventListener("mousedown", h); }, [onClose]);

  const cat = categories.find(c => c.id === catId);
  const chips = getQuickChips(type, cat?.name, savedComments);
  const isSaved = (text) => savedComments?.some(sc => sc.text === text && sc.type === type);

  const popoverHeight = 380; // approximate max height of popover
  const flipsUp = position.y + popoverHeight > window.innerHeight - 20;
  const topPos = flipsUp ? Math.max(10, position.y - popoverHeight - 10) : position.y + 10;

  return (
    <div ref={ref} style={{
      position: "fixed", left: Math.min(position.x, window.innerWidth - 340), top: topPos,
      width: 310, background: "#1e1e28", border: "1px solid #333345", borderRadius: 16,
      padding: 16, zIndex: 1000, boxShadow: "0 16px 48px rgba(0,0,0,0.6)", fontFamily: "'Outfit'",
      maxHeight: "calc(100vh - 40px)", overflowY: "auto",
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", marginBottom: 12 }}>Tag Selection</div>
      <div style={{ display: "flex", gap: 5, marginBottom: 10, flexWrap: "wrap" }}>
        {ANNOTATION_TYPES.map(t => (
          <button key={t.id} onClick={() => setType(t.id)} style={{
            padding: "5px 12px", borderRadius: 18, border: `2px solid ${type === t.id ? t.color : "#2a2a35"}`,
            background: type === t.id ? `${t.color}20` : "transparent",
            color: type === t.id ? t.color : "#777", fontSize: 11, fontWeight: 700,
            cursor: "pointer", fontFamily: "'Outfit'",
          }}>{t.emoji} {t.label}</button>
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
        {categories.map(c => (
          <button key={c.id} onClick={() => setCatId(c.id)} style={{
            padding: "3px 10px", borderRadius: 10, border: `1.5px solid ${catId === c.id ? c.color : "#2a2a35"}`,
            background: catId === c.id ? `${c.color}18` : "transparent",
            color: catId === c.id ? c.color : "#666", fontSize: 10, fontWeight: 700,
            cursor: "pointer", fontFamily: "'Outfit'",
          }}>{c.icon} {c.name}</button>
        ))}
      </div>
      {/* Quick comment chips */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
        {chips.map((chip, i) => (
          <div key={chip + i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button onClick={() => setComment(chip)} style={{
              flex: 1, padding: "6px 10px", borderRadius: 8, border: "1px solid #2a2a35",
              background: comment === chip ? "rgba(29,185,84,0.12)" : "#14141c",
              color: comment === chip ? "#1DB954" : "rgba(255,255,255,0.5)",
              fontSize: 11, fontFamily: "'Outfit'", cursor: "pointer", textAlign: "left",
              lineHeight: 1.4, transition: "all 0.15s",
            }}>{chip}</button>
            <button onClick={() => onSaveComment?.(chip, type)} style={{
              background: "none", border: "none", cursor: "pointer", fontSize: 11, padding: "2px 4px",
              color: isSaved(chip) ? "#FFD700" : "#333", transition: "color 0.15s",
            }} title={isSaved(chip) ? "Saved" : "Save to My Comments"}>★</button>
          </div>
        ))}
      </div>
      <textarea value={comment} onChange={e => setComment(e.target.value)}
        placeholder="Or write your own..."
        style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #2a2a35", background: "#14141c", color: "#ddd", fontSize: 12, fontFamily: "'Outfit'", resize: "none", height: 44, lineHeight: 1.5 }}
      />
      <button onClick={() => onSubmit({ type, catId, comment })} style={{
        width: "100%", padding: "9px", borderRadius: 10, border: "none",
        background: "#1DB954", color: "#fff", fontSize: 13, fontWeight: 700,
        cursor: "pointer", fontFamily: "'Outfit'", marginTop: 8,
      }}>Add ✓</button>
    </div>
  );
}

// ─── ANNOTATION CARD (Editable + Approvable) ─────────────────
function AnnotationCard({ ann, categories, onRemove, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [editComment, setEditComment] = useState(ann.comment || "");
  const t = ANNOTATION_TYPES.find(t => t.id === ann.type);
  const c = categories.find(c => c.id === ann.catId);
  const isAI = ann.source === "ai" || ann.source === "imported";
  const isApproved = ann.approved;
  const needsApproval = isAI && !isApproved;

  const saveEdit = () => {
    onUpdate(ann.id, { comment: editComment, approved: true });
    setEditing(false);
  };

  const approve = () => {
    onUpdate(ann.id, { approved: true });
  };

  const cycleType = () => {
    const types = ANNOTATION_TYPES.map(t => t.id);
    const next = types[(types.indexOf(ann.type) + 1) % types.length];
    onUpdate(ann.id, { type: next });
  };

  const sourceBadge = ann.source === "imported" && !isApproved
    ? { text: "Imported · review", color: "#F573A0" }
    : ann.source === "ai" && !isApproved
    ? { text: "AI · needs review", color: "#509BF5" }
    : ann.source === "imported" && isApproved
    ? { text: "Imported ✓", color: "#1DB954" }
    : ann.source === "ai" && isApproved
    ? { text: "AI ✓", color: "#1DB954" }
    : null;

  return (
    <div style={{
      padding: "8px 10px", borderRadius: 10, marginBottom: 6,
      background: (t?.color || "#1DB954") + "0d",
      borderLeft: `3px solid ${t?.color || "#1DB954"}`,
      border: needsApproval ? `1px solid #509BF540` : undefined,
      borderLeftWidth: 3, borderLeftStyle: "solid", borderLeftColor: t?.color || "#1DB954",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
        <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, cursor: "pointer" }} onClick={cycleType} title="Click to change type">{t?.emoji}</span>
          <select value={ann.catId} onChange={e => onUpdate(ann.id, { catId: e.target.value })} style={{
            fontSize: 9, color: c?.color, fontWeight: 700, background: "transparent", border: "none",
            cursor: "pointer", fontFamily: "'Outfit'", padding: 0,
          }}>
            {categories.map(cat => <option key={cat.id} value={cat.id} style={{ background: "#1e1e28", color: cat.color }}>{cat.icon} {cat.name}</option>)}
          </select>
          {isAI && !isApproved && <span style={{ fontSize: 8, color: sourceBadge?.color || "#509BF5", background: (sourceBadge?.color || "#509BF5") + "20", padding: "1px 5px", borderRadius: 6, fontWeight: 700 }}>{sourceBadge?.text || "Review"}</span>}
          {isAI && isApproved && <span style={{ fontSize: 8, color: "#1DB954", background: "#1DB95420", padding: "1px 5px", borderRadius: 6, fontWeight: 700 }}>{sourceBadge?.text || "✓"}</span>}
        </div>
        <button onClick={() => onRemove(ann.id)} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 13, padding: "0 3px" }}>×</button>
      </div>

      {/* Quote */}
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", fontStyle: "italic", lineHeight: 1.4 }}>
        "{ann.text.length > 70 ? ann.text.slice(0, 70) + "…" : ann.text}"
      </div>

      {/* Comment display or edit */}
      {editing ? (
        <div style={{ marginTop: 6 }}>
          <textarea value={editComment} onChange={e => setEditComment(e.target.value)}
            style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #333", background: "#0f0f13", color: "#ddd", fontSize: 11, fontFamily: "'Outfit'", resize: "none", height: 48, lineHeight: 1.5 }}
            autoFocus placeholder="Add your comment..."
          />
          <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
            <button onClick={saveEdit} style={{ flex: 1, padding: "5px", borderRadius: 6, border: "none", background: "#1DB954", color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "'Outfit'" }}>Save ✓</button>
            <button onClick={() => { setEditing(false); setEditComment(ann.comment || ""); }} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #333", background: "transparent", color: "#888", fontSize: 10, cursor: "pointer", fontFamily: "'Outfit'" }}>Cancel</button>
          </div>
        </div>
      ) : (
        <>
          {ann.comment && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2, lineHeight: 1.4 }}>{ann.comment}</div>}
          <div style={{ display: "flex", gap: 4, marginTop: 5 }}>
            <button onClick={() => { setEditComment(ann.comment || ""); setEditing(true); }} style={{
              padding: "3px 10px", borderRadius: 6, border: "1px solid #2a2a35",
              background: "transparent", color: "#888", fontSize: 9, fontWeight: 600,
              cursor: "pointer", fontFamily: "'Outfit'",
            }}>✏️ Edit</button>
            {needsApproval && (
              <button onClick={approve} style={{
                padding: "3px 10px", borderRadius: 6, border: "1px solid #1DB95440",
                background: "#1DB95412", color: "#1DB954", fontSize: 9, fontWeight: 700,
                cursor: "pointer", fontFamily: "'Outfit'",
              }}>✓ Approve</button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── PAPER ANNOTATOR ──────────────────────────────────────────
function PaperAnnotator({ paperText, categories, annotations, setAnnotations, categoryScores, setCategoryScores, onAISuggest, aiLoading, savedComments, onSaveComment, skipScores, unmatched, setUnmatched }) {
  const [selection, setSelection] = useState(null);
  const [popPos, setPopPos] = useState(null);
  const words = useMemo(() => splitWords(paperText), [paperText]);
  const [dragStart, setDragStart] = useState(null);
  const [dragEnd, setDragEnd] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [undoStack, setUndoStack] = useState([]);

  // Fix #9: Initialize category scores properly on mount
  useEffect(() => {
    setCategoryScores(prev => {
      const next = { ...prev };
      let changed = false;
      categories.forEach(c => {
        if (next[c.id] === undefined || next[c.id] === null) {
          next[c.id] = Math.round(c.maxScore / 2);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [categories]);

  const onDown = (i) => { setDragStart(i); setDragEnd(i); setIsDragging(true); setSelection(null); setPopPos(null); };
  const onEnter = (i) => { if (isDragging) setDragEnd(i); };

  // Fix #15: Touch support
  const touchRef = useRef(null);
  const onTouchStart = (i, e) => { touchRef.current = { startIdx: i, moved: false }; setDragStart(i); setDragEnd(i); setIsDragging(true); setSelection(null); setPopPos(null); };
  const onTouchMove = useCallback((e) => {
    if (!touchRef.current) return;
    touchRef.current.moved = true;
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const idx = el?.dataset?.widx;
    if (idx !== undefined) setDragEnd(parseInt(idx));
  }, []);
  const onTouchEnd = useCallback((e) => {
    if (!touchRef.current) return;
    const { isDragging: d, dragStart: ds, dragEnd: de } = dragRef.current;
    if (!d || ds === null || de === null) { touchRef.current = null; return; }
    setIsDragging(false);
    const s = Math.min(ds, de), en = Math.max(ds, de);
    const txt = words.slice(s, en + 1).map(w => w.word).join(" ");
    if (txt.trim().length < 2) { touchRef.current = null; return; }
    const touch = e.changedTouches?.[0];
    setSelection({ start: s, end: en, text: txt });
    setPopPos({ x: (touch?.clientX || 150) - 155, y: (touch?.clientY || 300) });
    touchRef.current = null;
  }, [words]);

  const dragRef = useRef({ isDragging, dragStart, dragEnd });
  dragRef.current = { isDragging, dragStart, dragEnd };

  useEffect(() => {
    const up = (e) => {
      const { isDragging: d, dragStart: ds, dragEnd: de } = dragRef.current;
      if (!d || ds === null || de === null) return;
      setIsDragging(false);
      const s = Math.min(ds, de), en = Math.max(ds, de);
      const txt = words.slice(s, en + 1).map(w => w.word).join(" ");
      if (txt.trim().length < 2) return;
      setSelection({ start: s, end: en, text: txt });
      setPopPos({ x: e.clientX - 155, y: e.clientY });
    };
    window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    return () => { window.removeEventListener("mouseup", up); window.removeEventListener("touchmove", onTouchMove); window.removeEventListener("touchend", onTouchEnd); };
  }, [words, onTouchMove, onTouchEnd]);

  // Fix #16: Keyboard shortcuts
  useEffect(() => {
    const h = (e) => {
      if (!selection || !popPos) return;
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;
      if (e.key === "1" || e.key === "2" || e.key === "3") {
        e.preventDefault();
        const types = ["strength", "growth", "greatestHit"];
        const type = types[parseInt(e.key) - 1];
        setAnnotations(p => [...p, { id: uid(), start: selection.start, end: selection.end, text: selection.text, type, catId: categories[0]?.id, comment: "", source: "teacher", approved: true }]);
        setSelection(null); setPopPos(null);
      }
      if (e.key === "Escape") { setSelection(null); setPopPos(null); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [selection, popPos, categories]);

  const addAnn = ({ type, catId, comment }) => {
    if (!selection) return;
    setAnnotations(p => [...p, { id: uid(), start: selection.start, end: selection.end, text: selection.text, type, catId, comment, source: "teacher", approved: true }]);
    setSelection(null); setPopPos(null);
  };

  // Fix #6: Undo support
  const removeAnn = (id) => {
    const removed = annotations.find(a => a.id === id);
    if (removed) setUndoStack(p => [...p.slice(-9), removed]);
    setAnnotations(p => p.filter(a => a.id !== id));
  };
  const undo = () => {
    if (undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    setUndoStack(p => p.slice(0, -1));
    setAnnotations(p => [...p, last]);
  };

  const linkUnmatched = (unmatchedIdx) => {
    if (!selection) return;
    const um = unmatched[unmatchedIdx];
    setAnnotations(p => [...p, {
      id: uid(), start: selection.start, end: selection.end, text: selection.text,
      type: "strength", catId: categories[0]?.id, comment: um.comment,
      source: "imported", approved: false,
    }]);
    setUnmatched(p => p.filter((_, i) => i !== unmatchedIdx));
    setSelection(null); setPopPos(null);
  };

  // Fix #13: Approve all
  const approveAll = () => {
    setAnnotations(p => p.map(a => (a.source === "ai" || a.source === "imported") && !a.approved ? { ...a, approved: true } : a));
  };

  // Fix #1: O(1) highlight lookup via interval map
  const hlMap = useMemo(() => {
    const map = {};
    for (const a of annotations) {
      const t = ANNOTATION_TYPES.find(t => t.id === a.type);
      const color = t?.color || "#1DB954";
      for (let i = a.start; i <= a.end; i++) {
        map[i] = { color, bg: color + "25" };
      }
    }
    return map;
  }, [annotations]);

  const getHL = (idx) => {
    if (hlMap[idx]) return hlMap[idx];
    if (isDragging && dragStart !== null && dragEnd !== null) {
      const s = Math.min(dragStart, dragEnd), e = Math.max(dragStart, dragEnd);
      if (idx >= s && idx <= e) return { color: "#1DB954", bg: "rgba(29,185,84,0.2)" };
    }
    return null;
  };

  // Fix #5: Stable onClose
  const closePopover = useCallback(() => { setPopPos(null); setSelection(null); }, []);

  const needsReview = annotations.filter(a => (a.source === "ai" || a.source === "imported") && !a.approved).length;

  return (
    <div style={{ display: "flex", gap: 20, height: "calc(100vh - 156px)", minHeight: 480 }}>
      {/* Paper */}
      <div style={{ flex: 1, overflowY: "auto", background: "#13131a", borderRadius: 16, border: "1px solid #222230" }}>
        <div style={{ padding: "9px 18px", borderBottom: "1px solid #1e1e28", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ fontSize: 11, color: "#555", fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>Highlight to annotate</span>
            {selection && <span style={{ fontSize: 10, color: "#888", marginLeft: 10 }}>1=💪 2=🌱 3=🏆</span>}
          </div>
          <button onClick={onAISuggest} disabled={aiLoading} style={{
            padding: "6px 14px", borderRadius: 18, border: "1px solid #333",
            background: aiLoading ? "#1a1a22" : "linear-gradient(135deg,#1DB95418,#509BF518)",
            color: aiLoading ? "#555" : "#1DB954", fontSize: 11, fontWeight: 700, cursor: aiLoading ? "wait" : "pointer", fontFamily: "'Outfit'",
          }}>
            {aiLoading ? <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ display: "inline-block", width: 11, height: 11, border: "2px solid #555", borderTopColor: "transparent", borderRadius: "50%", animation: "spin .7s linear infinite" }} />Analyzing...</span> : "✨ AI Suggest"}
          </button>
        </div>
        <div style={{ padding: "24px 32px", fontSize: 16, lineHeight: 2.1, color: "rgba(255,255,255,0.85)", fontFamily: "'Crimson Pro',Georgia,serif", userSelect: "none", cursor: "text" }}>
          {words.map((w, i) => {
            const hl = getHL(i);
            const brk = w.space.includes("\n");
            return (<span key={i}><span data-widx={i} onMouseDown={() => onDown(i)} onMouseEnter={() => onEnter(i)} onTouchStart={(e) => onTouchStart(i, e)} style={{
              backgroundColor: hl ? hl.bg : "transparent", borderBottom: hl ? `2px solid ${hl.color}` : "none",
              borderRadius: 3, padding: "2px 0", transition: "background-color 0.15s",
            }}>{w.word}</span>{brk ? <><br /><br /></> : w.space ? " " : ""}</span>);
          })}
        </div>
      </div>

      {/* Sidebar */}
      <div style={{ width: 300, flexShrink: 0, display: "flex", flexDirection: "column", gap: 0, overflowY: "hidden", background: "#13131a", borderRadius: 16, border: "1px solid #222230" }}>

        {/* Compact score strip at top */}
        {!skipScores && (
        <div style={{ padding: "10px 14px", borderBottom: "1px solid #1e1e28" }}>
          <div style={{ fontSize: 9, color: "#555", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Category Scores</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {categories.map(cat => (
              <div key={cat.id} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 8px 4px 6px", borderRadius: 8, background: cat.color + "10", border: `1px solid ${cat.color}25` }}>
                <span style={{ fontSize: 11 }}>{cat.icon}</span>
                <span style={{ fontSize: 10, color: cat.color, fontWeight: 600, maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cat.name}</span>
                <input type="number" min={0} max={cat.maxScore}
                  value={categoryScores[cat.id] ?? Math.round(cat.maxScore / 2)}
                  onChange={e => setCategoryScores(p => ({ ...p, [cat.id]: Math.min(cat.maxScore, Math.max(0, parseInt(e.target.value) || 0)) }))}
                  style={{ width: 36, padding: "2px 3px", borderRadius: 4, border: "none", background: "transparent", color: cat.color, fontSize: 13, fontWeight: 800, fontFamily: "'JetBrains Mono'", textAlign: "center" }}
                />
                <span style={{ fontSize: 9, color: "#555" }}>/{cat.maxScore}</span>
              </div>
            ))}
          </div>
        </div>
        )}

        {/* Summary status bar */}
        <div style={{ padding: "8px 14px", borderBottom: "1px solid #1e1e28", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {ANNOTATION_TYPES.map(t => {
            const count = annotations.filter(a => a.type === t.id).length;
            return (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <span style={{ fontSize: 11 }}>{t.emoji}</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: count > 0 ? t.color : "#333", fontFamily: "'JetBrains Mono'" }}>{count}</span>
              </div>
            );
          })}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {/* Fix #6: Undo button */}
            {undoStack.length > 0 && (
              <button onClick={undo} style={{ fontSize: 9, color: "#888", background: "rgba(255,255,255,0.05)", border: "none", padding: "2px 7px", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontFamily: "'Outfit'" }}>↩ Undo</button>
            )}
            {/* Fix #13: Approve all */}
            {needsReview > 0 && (
              <button onClick={approveAll} style={{ fontSize: 9, color: "#1DB954", background: "#1DB95412", border: "1px solid #1DB95430", padding: "2px 7px", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontFamily: "'Outfit'" }}>✓ Approve all ({needsReview})</button>
            )}
            {unmatched?.length > 0 && (
              <div style={{ fontSize: 9, color: "#FF6437", background: "#FF643715", padding: "2px 7px", borderRadius: 6, fontWeight: 700 }}>
                {unmatched.length} unlinked
              </div>
            )}
          </div>
        </div>

        {/* Fix #12: Per-category annotation counts */}
        <div style={{ padding: "6px 14px", borderBottom: "1px solid #1e1e28", display: "flex", flexWrap: "wrap", gap: 4 }}>
          {categories.map(cat => {
            const count = annotations.filter(a => a.catId === cat.id).length;
            return (
              <span key={cat.id} style={{ fontSize: 9, color: count > 0 ? cat.color : "#333", fontWeight: 600 }}>
                {cat.icon}{count}
              </span>
            );
          })}
        </div>

        {/* Annotations - main scrollable area */}
        <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px" }}>
          {/* Unlinked comments from import */}
          {unmatched?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: "#FF6437", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <span>🔗 Unlinked Comments ({unmatched.length})</span>
              </div>
              {unmatched.map((um, i) => (
                <div key={i} style={{
                  padding: "10px 12px", borderRadius: 10, marginBottom: 6,
                  background: "rgba(255,100,55,0.04)", border: "1px dashed rgba(255,100,55,0.25)",
                }}>
                  <div style={{ fontSize: 12, color: "#ccc", lineHeight: 1.5, marginBottom: 8 }}>"{um.comment}"</div>
                  {um.passage && <div style={{ fontSize: 10, color: "#555", marginBottom: 6, fontStyle: "italic" }}>Passage: "{um.passage.slice(0, 80)}{um.passage.length > 80 ? "…" : ""}"</div>}
                  {selection ? (
                    <button onClick={() => linkUnmatched(i)} style={{
                      padding: "5px 12px", borderRadius: 7, border: "1px solid #FF6437", background: "rgba(255,100,55,0.1)",
                      color: "#FF6437", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "'Outfit'",
                    }}>📌 Link to "{selection.text.split(/\s+/).slice(0, 4).join(" ")}…"</button>
                  ) : (
                    <div style={{ fontSize: 10, color: "#555" }}>Highlight text in paper to link this comment</div>
                  )}
                  <button onClick={() => setUnmatched(p => p.filter((_, j) => j !== i))} style={{
                    marginTop: 4, padding: "3px 8px", borderRadius: 6, border: "none", background: "transparent",
                    color: "#444", fontSize: 9, cursor: "pointer", fontFamily: "'Outfit'",
                  }}>✕ Dismiss</button>
                </div>
              ))}
            </div>
          )}
          {annotations.length === 0 && (!unmatched || unmatched.length === 0) && (
            <div style={{ color: "#444", fontSize: 13, textAlign: "center", padding: "40px 16px", lineHeight: 1.7 }}>
              <div style={{ fontSize: 28, marginBottom: 10, opacity: 0.5 }}>👆</div>
              Highlight text in the paper to start annotating
            </div>
          )}
          {annotations.map(ann => <AnnotationCard key={ann.id} ann={ann} categories={categories} onRemove={removeAnn} onUpdate={(id, updates) => setAnnotations(p => p.map(a => a.id === id ? { ...a, ...updates } : a))} />)}
        </div>
      </div>
      {popPos && selection && <AnnotationPopover position={popPos} categories={categories} onSubmit={addAnn} onClose={closePopover} savedComments={savedComments} onSaveComment={onSaveComment} />}
    </div>
  );
}

// ─── PREVIEW CARD ─────────────────────────────────────────────
function PreviewCard({ title, enabled, onToggle, bg, children }) {
  return (
    <div style={{
      borderRadius: 16, overflow: "hidden",
      border: `2px solid ${enabled ? "#1DB95430" : "#1e1e28"}`,
      opacity: enabled ? 1 : 0.5, transition: "all 0.3s",
    }}>
      {/* Gradient header bar */}
      <div style={{
        background: bg, padding: "10px 16px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{title}</span>
        <div onClick={onToggle} style={{
          width: 36, height: 20, borderRadius: 10, cursor: "pointer",
          background: enabled ? "#1DB954" : "rgba(255,255,255,0.15)", position: "relative",
        }}>
          <div style={{
            width: 16, height: 16, borderRadius: "50%", background: "#fff",
            position: "absolute", top: 2, left: enabled ? 18 : 2, transition: "left 0.2s",
          }} />
        </div>
      </div>
      {/* Editable body */}
      {enabled && (
        <div style={{ background: "#13131a", padding: 16 }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────
function Dashboard({ onLaunch }) {
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);
  const goStep = (i) => { setStep(i); setMaxStep(p => Math.max(p, i)); };
  const [studentName, setStudentName] = useState("");
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [gradeLevel, setGradeLevel] = useState("9");
  const [feedbackVibe, setFeedbackVibe] = useState("balanced");
  const [paperText, setPaperText] = useState("");
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [annotations, setAnnotations] = useState([]);
  const [categoryScores, setCategoryScores] = useState({});
  const [teacherNote, setTeacherNote] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiData, setAiData] = useState(null);
  const [enabledSlides, setEnabledSlides] = useState({ opener: true, stats: true, paper: true, hits: true, growth: true, note: true, quiz: true, profile: true });
  const [skipScores, setSkipScores] = useState(false);
  const [savedComments, setSavedComments] = useState([]);
  const [hitOrder, setHitOrder] = useState(null); // null = use default order
  const [importing, setImporting] = useState(false);
  const [unmatched, setUnmatched] = useState([]);
  const [importStatus, setImportStatus] = useState("");
  const fileRef = useRef(null);

  const handleSaveComment = (text, type) => {
    setSavedComments(prev => {
      const exists = prev.some(sc => sc.text === text && sc.type === type);
      if (exists) return prev.filter(sc => !(sc.text === text && sc.type === type));
      return [...prev, { text, type }];
    });
  };

  const handleDocxImport = async (file) => {
    setImporting(true);
    setImportStatus("Reading document...");
    try {
      const arrayBuffer = await file.arrayBuffer();

      // Run mammoth and ZIP parsing in PARALLEL
      setImportStatus("Extracting text & comments...");
      const [textResult, zipResult] = await Promise.all([
        mammoth.extractRawText({ arrayBuffer: arrayBuffer.slice(0) }),
        parseDocxComments(arrayBuffer),
      ]);

      const rawText = textResult.value.trim();
      if (!rawText) { setImportStatus("Could not extract text."); setImporting(false); return; }

      const extractedComments = zipResult.comments || [];
      if (zipResult.error) console.warn("ZIP parse warning:", zipResult.error);

      // Set paper text and name immediately
      const fileName = file.name.replace(/\.docx$/i, "").replace(/[_-]/g, " ");
      setPaperText(rawText);
      if (!studentName) setStudentName(fileName);

      const words = splitWords(rawText);

      // If we have comments with passages, create annotations INSTANTLY (no AI needed)
      if (extractedComments.length > 0) {
        setImportStatus(`Found ${extractedComments.length} comments — loading...`);

        const instantAnns = [];
        const unmatchedImports = [];
        extractedComments.forEach((ec, commentIdx) => {
          if (!ec.passage) {
            unmatchedImports.push({ commentIndex: commentIdx, comment: ec.comment, author: ec.author });
            return;
          }
          // Match passage to word positions
          const passageWords = ec.passage.toLowerCase().split(/\s+/).filter(Boolean);
          if (passageWords.length === 0) {
            unmatchedImports.push({ commentIndex: commentIdx, comment: ec.comment, author: ec.author });
            return;
          }

          let found = false;
          for (let i = 0; i <= words.length - passageWords.length; i++) {
            let match = true;
            for (let j = 0; j < Math.min(passageWords.length, 30); j++) {
              const docWord = words[i + j].word.toLowerCase().replace(/[^a-z']/g, "");
              const passWord = passageWords[j].replace(/[^a-z']/g, "");
              if (!docWord.startsWith(passWord.slice(0, 4)) && !passWord.startsWith(docWord.slice(0, 4))) { match = false; break; }
            }
            if (match) {
              const end = Math.min(i + passageWords.length - 1, words.length - 1);
              instantAnns.push({
                id: uid(), start: i, end,
                text: words.slice(i, end + 1).map(w => w.word).join(" "),
                type: "strength", catId: categories[0]?.id,
                comment: ec.comment, source: "imported", approved: false,
                commentIndex: commentIdx,
              });
              found = true;
              break;
            }
          }
          if (!found) {
            unmatchedImports.push({ commentIndex: commentIdx, comment: ec.comment, author: ec.author, passage: ec.passage });
          }
        });

        // Show annotations immediately and jump to annotate
        setAnnotations(instantAnns);
        setUnmatched(unmatchedImports);
        setImportStatus(`✓ ${instantAnns.length} annotations placed${unmatchedImports.length > 0 ? ` · ${unmatchedImports.length} unlinked` : ""}!`);
        setTimeout(() => { goStep(2); setImporting(false); setImportStatus(""); }, 800);

        // Fire AI in background for classification, scores, profile, quiz
        const commentSummary = extractedComments.map((c, i) =>
          `Comment ${i + 1}: "${c.comment}"${c.passage ? ` → passage: "${c.passage}"` : ""}`
        ).join("\n");
        const catStr = categories.map(c => `${c.name} (id: ${c.id}, max ${c.maxScore})`).join(", ");

        fetch("https://api.anthropic.com/v1/messages", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 2000,
            messages: [{ role: "user", content: `You are an expert writing teacher (grade ${gradeLevel} level). A teacher's comments on a student paper have already been placed as annotations. Now classify each and generate scores/profile/quiz.

Teacher comments:
${commentSummary}

Categories: ${catStr}

Return ONLY valid JSON:
{
  "classifications": [
    { "commentIndex": 0, "type": "strength|growth|greatestHit", "catId": "${categories[0]?.id}" }
  ],
  "categoryScores": { ${categories.map(c => `"${c.id}": <0-${c.maxScore}>`).join(", ")} },
  "growthEdge": { "area": "2-4 words", "explanation": "1-2 sentences", "actionSteps": ["s1","s2","s3"] },
  "writerProfile": { "title": "creative 2-4 word archetype", "strengths": ["s1","s2","s3"], "style": "one vivid sentence", "growthAreas": ["g1","g2"] },
  "quizQuestions": [
    { "question": "tests feedback comprehension", "options": ["a","b","c","d"], "correctIndex": 0, "explanation": "why" }
  ]
}

Classify each comment by index (0-based). Use catIds: ${categories.map(c => c.id).join(", ")}. Generate 3 quiz questions.` }] }),
        }).then(r => r.json()).then(data => {
          try {
            const parsed = JSON.parse((data.content?.map(i => i.text || "").join("") || "").replace(/```json|```/g, "").trim());

            // Apply classifications to existing annotations by commentIndex
            if (parsed.classifications) {
              setAnnotations(prev => prev.map(ann => {
                if (ann.commentIndex == null) return ann;
                const cls = parsed.classifications.find(c => c.commentIndex === ann.commentIndex);
                return cls ? { ...ann, type: cls.type || ann.type, catId: cls.catId || ann.catId } : ann;
              }));
            }
            if (parsed.categoryScores) setCategoryScores(parsed.categoryScores);
            if (parsed.quizQuestions) setQuizQuestions(parsed.quizQuestions);
            setAiData(parsed);
            if (parsed.writerProfile) setWriterProfile(parsed.writerProfile);
            if (parsed.growthEdge) setGrowthEdge(parsed.growthEdge);
          } catch (e) { console.error("AI enrichment parse error:", e); }
        }).catch(e => console.error("AI enrichment failed:", e));

      } else {
        // No comments found — need full AI analysis
        setImportStatus("No comments found — AI analyzing paper...");
        const catStr = categories.map(c => `${c.name} (id: ${c.id}, max ${c.maxScore})`).join(", ");

        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 3000,
            messages: [{ role: "user", content: `You are an expert writing teacher (grade ${gradeLevel}). Analyze this student paper. Categories: ${catStr}

Return ONLY valid JSON:
{
  "annotations": [
    { "text": "exact quote 5-20 words", "type": "strength|growth|greatestHit", "catId": "${categories[0]?.id}", "comment": "1-sentence feedback" }
  ],
  "categoryScores": { ${categories.map(c => `"${c.id}": <0-${c.maxScore}>`).join(", ")} },
  "growthEdge": { "area": "2-4 words", "explanation": "1-2 sentences", "actionSteps": ["s1","s2","s3"] },
  "writerProfile": { "title": "creative archetype", "strengths": ["s1","s2","s3"], "style": "one sentence", "growthAreas": ["g1","g2"] },
  "quizQuestions": [
    { "question": "comprehension question", "options": ["a","b","c","d"], "correctIndex": 0, "explanation": "why" }
  ]
}

CatIds: ${categories.map(c => c.id).join(", ")}. 5-7 annotations, 3 quiz questions. Exact quotes.

Paper:
---
${rawText}
---` }] }),
        });

        const data = await res.json();
        const parsed = JSON.parse((data.content?.map(i => i.text || "").join("") || "").replace(/```json|```/g, "").trim());

        const newAnns = [];
        parsed.annotations?.forEach(hl => {
          const hlW = hl.text.toLowerCase().split(/\s+/);
          for (let i = 0; i <= words.length - hlW.length; i++) {
            let match = true;
            for (let j = 0; j < hlW.length; j++) {
              if (!words[i + j].word.toLowerCase().startsWith(hlW[j].replace(/[^a-z']/g, "").slice(0, 4))) { match = false; break; }
            }
            if (match) {
              newAnns.push({
                id: uid(), start: i, end: i + hlW.length - 1,
                text: words.slice(i, i + hlW.length).map(w => w.word).join(" "),
                type: hl.type || "strength", catId: hl.catId || categories[0]?.id,
                comment: hl.comment, source: "ai", approved: false,
              });
              break;
            }
          }
        });

        setAnnotations(newAnns);
        if (parsed.categoryScores) setCategoryScores(parsed.categoryScores);
        if (parsed.quizQuestions) setQuizQuestions(parsed.quizQuestions);
        setAiData(parsed);
        if (parsed.writerProfile) setWriterProfile(parsed.writerProfile);
        if (parsed.growthEdge) setGrowthEdge(parsed.growthEdge);

        setImportStatus(`✓ ${newAnns.length} annotations generated!`);
        setTimeout(() => { goStep(2); setImporting(false); setImportStatus(""); }, 1200);
      }

    } catch (err) {
      console.error(err);
      setImportStatus("Error processing document. Try pasting text instead.");
      setImporting(false);
    }
  };

  const steps = ["Paper", "Categories", "Annotate", "Customize", "Preview"];

  useEffect(() => {
    if (step === 2) {
      const init = {};
      categories.forEach(c => { if (categoryScores[c.id] === undefined) init[c.id] = Math.round(c.maxScore / 2); });
      if (Object.keys(init).length) setCategoryScores(p => ({ ...init, ...p }));
    }
  }, [step, categories]);

  const runAI = async () => {
    setAiLoading(true);
    const catStr = categories.map(c => `${c.name} (out of ${c.maxScore})`).join(", ");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 4000,
          messages: [{ role: "user", content: `You are an expert writing teacher working with a grade ${gradeLevel} student. Adjust all language, feedback tone, quiz difficulty, and writer profile to be appropriate for this level. Analyze this student paper across: ${catStr}.

Return ONLY valid JSON, no markdown:
{
  "suggestedHighlights": [
    { "text": "exact short quote from paper (5-20 words)", "type": "strength|growth|greatestHit", "catId": "${categories[0]?.id}", "comment": "1-sentence explanation" }
  ],
  "categoryScores": { ${categories.map(c => `"${c.id}": <0-${c.maxScore}>`).join(", ")} },
  "growthEdge": { "area": "2-4 word focus", "explanation": "1-2 sentences", "actionSteps": ["step1","step2","step3"] },
  "quizQuestions": [
    { "question": "feedback comprehension question", "options": ["a","b","c","d"], "correctIndex": 0, "explanation": "why" }
  ],
  "writerProfile": { "title": "creative 2-4 word archetype", "strengths": ["s1","s2","s3"], "style": "one vivid sentence", "growthAreas": ["g1","g2"] }
}

Use catId values: ${categories.map(c => c.id).join(", ")}. Provide 4-6 highlights, 3 quiz questions. Use exact quotes. Paper:

---
${paperText}
---` }] }),
      });
      const data = await res.json();
      const parsed = JSON.parse((data.content?.map(i => i.text || "").join("") || "").replace(/```json|```/g, "").trim());

      const words = splitWords(paperText);
      const aiAnns = [];
      parsed.suggestedHighlights?.forEach(hl => {
        const hlW = hl.text.toLowerCase().split(/\s+/);
        for (let i = 0; i <= words.length - hlW.length; i++) {
          let match = true;
          for (let j = 0; j < hlW.length; j++) {
            if (!words[i + j].word.toLowerCase().startsWith(hlW[j].replace(/[^a-z']/g, "").slice(0, 4))) { match = false; break; }
          }
          if (match) {
            aiAnns.push({ id: uid(), start: i, end: i + hlW.length - 1, text: words.slice(i, i + hlW.length).map(w => w.word).join(" "), type: hl.type || "strength", catId: hl.catId || categories[0]?.id, comment: hl.comment, source: "ai", approved: false });
            break;
          }
        }
      });
      setAnnotations(p => [...p, ...aiAnns]);
      if (parsed.categoryScores) setCategoryScores(p => ({ ...p, ...parsed.categoryScores }));
      setAiData(parsed);
    } catch (err) { console.error(err); }
    setAiLoading(false);
  };

  const [quizLoading, setQuizLoading] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [writerProfile, setWriterProfile] = useState(null);
  const [growthEdge, setGrowthEdge] = useState(null);

  // Initialize profile/growth from AI when available
  useEffect(() => {
    if (aiData?.writerProfile && !writerProfile) setWriterProfile(aiData.writerProfile);
    if (aiData?.growthEdge && !growthEdge) setGrowthEdge(aiData.growthEdge);
  }, [aiData]);

  const generateQuiz = async () => {
    setQuizLoading(true);
    const commentedAnns = annotations.filter(a => a.comment);
    const feedbackSummary = commentedAnns.map(a => {
      const t = ANNOTATION_TYPES.find(t => t.id === a.type);
      const c = categories.find(c => c.id === a.catId);
      return `[${t?.label || a.type}] (${c?.name || "General"}) Passage: "${a.text}" — Teacher comment: "${a.comment}"`;
    }).join("\n");

    const scoreSummary = categories.map(c => `${c.name}: ${categoryScores[c.id] ?? "—"}/${c.maxScore}`).join(", ");

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 2000,
          messages: [{ role: "user", content: `You are helping a teacher create a comprehension quiz for a grade ${gradeLevel} student to ensure they understood the feedback on their paper. Use age-appropriate language and complexity.

The teacher gave the following feedback annotations on the student's paper:

${feedbackSummary}

Category scores: ${scoreSummary}
${teacherNote ? `Teacher's personal note: "${teacherNote}"` : ""}

Generate quiz questions that test whether the student UNDERSTOOD the feedback — not whether they remember the paper content, but whether they grasped what the teacher was telling them to improve or what was done well. Questions should reference specific feedback comments.

Return ONLY valid JSON, no markdown:
{
  "quizQuestions": [
    { "question": "question that tests feedback comprehension", "options": ["a","b","c","d"], "correctIndex": 0, "explanation": "why this answer connects to the teacher's feedback" }
  ]
}

Generate ${Math.min(Math.max(commentedAnns.length, 2), 5)} questions. Make them specific to the actual comments given.` }] }),
      });
      const data = await res.json();
      const parsed = JSON.parse((data.content?.map(i => i.text || "").join("") || "").replace(/```json|```/g, "").trim());
      if (parsed.quizQuestions) setQuizQuestions(parsed.quizQuestions);
    } catch (err) { console.error(err); }
    setQuizLoading(false);
  };

  const launch = () => {
    const stats = computeStats(paperText);
    const hits = annotations.filter(a => a.type === "greatestHit");
    const strengths = annotations.filter(a => a.type === "strength");
    const rawHits = hits.length > 0 ? hits : strengths.slice(0, 2);
    // Apply custom order if set
    const orderedHits = hitOrder ? hitOrder.map(id => rawHits.find(h => h.id === id)).filter(Boolean) : rawHits;
    onLaunch({
      studentName, assignmentTitle, paperText, categories, annotations, categoryScores,
      teacherNote, enabledSlides, stats, skipScores,
      greatestHits: orderedHits,
      growthEdge: growthEdge || { area: "Keep Growing", explanation: "Focus on your craft.", actionSteps: ["Re-read feedback", "Revise one paragraph", "Read a mentor text"] },
      quizQuestions: quizQuestions.length > 0 ? quizQuestions : (aiData?.quizQuestions || []),
      writerProfile: writerProfile || { title: "Emerging Voice", strengths: ["Effort", "Ideas"], style: "A writer finding their way.", growthAreas: ["Depth"] },
    });
  };

  return (
    <div style={{ fontFamily: "'Outfit'", background: "#0f0f13", minHeight: "100vh", color: "#e0e0e0", display: "flex" }}>
      {/* Sidebar nav */}
      <div style={{ width: 210, minHeight: "100vh", background: "#16161d", borderRight: "1px solid #222230", padding: "22px 0", flexShrink: 0 }}>
        <div style={{ padding: "0 18px 22px", borderBottom: "1px solid #222230" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 19 }}>📝</span><span style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>PaperWrapped</span></div>
          <span style={{ fontSize: 9, color: "#555", letterSpacing: 1, textTransform: "uppercase" }}>Feedback Builder</span>
        </div>
        <div style={{ padding: "16px 10px" }}>
          {steps.map((s, i) => (
            <div key={s} onClick={() => i <= maxStep && goStep(i)} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", borderRadius: 10, marginBottom: 2,
              cursor: i <= maxStep ? "pointer" : "default", background: step === i ? "rgba(29,185,84,0.12)" : "transparent",
            }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, background: i < step ? "#1DB954" : step === i ? "#1DB954" : i <= maxStep ? "#2a2a3a" : "#2a2a35", color: i <= maxStep ? "#fff" : "#555" }}>{i < step ? "✓" : i + 1}</div>
              <span style={{ fontSize: 12, fontWeight: step === i ? 700 : 500, color: i <= maxStep ? "#fff" : "#555" }}>{s}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main area */}
      <div style={{ flex: 1, padding: step === 2 ? "22px 24px" : "30px 40px", overflowY: "auto", maxHeight: "100vh" }}>
        {step === 0 && (
          <div className="af">
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "#fff", marginBottom: 4 }}>Let's build some feedback</h1>
            <p style={{ color: "#777", fontSize: 13, marginBottom: 28 }}>Start from scratch or import a doc you've already graded.</p>

            {/* Import card */}
            <div style={{
              padding: "20px 24px", borderRadius: 16, marginBottom: 20,
              border: "2px dashed #333", background: "#13131a",
              textAlign: "center", cursor: importing ? "wait" : "pointer",
              transition: "border-color 0.2s",
            }}
              onClick={() => !importing && fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = "#1DB954"; }}
              onDragLeave={e => { e.currentTarget.style.borderColor = "#333"; }}
              onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = "#333"; const f = e.dataTransfer.files[0]; if (f?.name.endsWith(".docx")) handleDocxImport(f); }}
            >
              <input ref={fileRef} type="file" accept=".docx" style={{ display: "none" }}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleDocxImport(f); }} />
              {importing ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: "8px 0" }}>
                  <span style={{ display: "inline-block", width: 16, height: 16, border: "2.5px solid #1DB954", borderTopColor: "transparent", borderRadius: "50%", animation: "spin .7s linear infinite" }} />
                  <span style={{ fontSize: 14, color: "#1DB954", fontWeight: 600 }}>{importStatus}</span>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 4 }}>Import a Graded Document</div>
                  <div style={{ fontSize: 12, color: "#666" }}>Drop a .docx with comments from Google Docs or Word</div>
                  <div style={{ fontSize: 10, color: "#444", marginTop: 6 }}>Comments become annotations · AI fills scores, quiz, and profile</div>
                </>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
              <div style={{ flex: 1, height: 1, background: "#222230" }} />
              <span style={{ fontSize: 11, color: "#444", fontWeight: 600, letterSpacing: 1 }}>OR START FRESH</span>
              <div style={{ flex: 1, height: 1, background: "#222230" }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 14, marginBottom: 18 }}>
              <div><label style={lbl}>Student Name</label><input value={studentName} onChange={e => setStudentName(e.target.value)} placeholder="Jordan Smith" style={inp} /></div>
              <div><label style={lbl}>Assignment Title</label><input value={assignmentTitle} onChange={e => setAssignmentTitle(e.target.value)} placeholder="Persepolis Identity Essay" style={inp} /></div>
              <div><label style={lbl}>Grade Level</label>
                <select value={gradeLevel} onChange={e => setGradeLevel(e.target.value)} style={{ ...inp, cursor: "pointer", minWidth: 100, appearance: "none", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23666'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", paddingRight: 30 }}>
                  <option value="3">3rd</option><option value="4">4th</option><option value="5">5th</option>
                  <option value="6">6th</option><option value="7">7th</option><option value="8">8th</option>
                  <option value="9">9th</option><option value="10">10th</option><option value="11">11th</option>
                  <option value="12">12th</option><option value="AP">AP/IB</option><option value="College">College</option>
                </select>
              </div>
            </div>
            <label style={lbl}>Student Paper</label>
            <textarea value={paperText} onChange={e => setPaperText(e.target.value)} placeholder="Paste the student's paper here..."
              style={{ ...inp, minHeight: 240, resize: "vertical", lineHeight: 1.8, fontFamily: "'Crimson Pro',Georgia,serif", fontSize: 16 }} />
            {paperText.trim() && <div style={{ marginTop: 5, color: "#555", fontSize: 11 }}>{computeStats(paperText).wordCount} words</div>}
            <div style={{ marginTop: 22, display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => goStep(1)} disabled={!studentName.trim() || !paperText.trim()} style={studentName.trim() && paperText.trim() ? btnP : btnD}>Set Up Categories →</button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="af">
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "#fff", marginBottom: 4 }}>Your Feedback Categories</h1>
            <p style={{ color: "#777", fontSize: 13, marginBottom: 24 }}>Rename, recolor, set point values, add or remove. Make these yours.</p>
            <CategoryEditor categories={categories} setCategories={setCategories} />
            {/* Skip scoring toggle */}
            <div onClick={() => setSkipScores(s => !s)} style={{
              marginTop: 18, padding: "12px 16px", borderRadius: 12, cursor: "pointer",
              border: `2px solid ${skipScores ? "#FF643740" : "#222230"}`,
              background: skipScores ? "rgba(255,100,55,0.04)" : "#16161d",
              display: "flex", alignItems: "center", gap: 12, transition: "all 0.2s",
            }}>
              <div style={{ width: 36, height: 20, borderRadius: 10, background: skipScores ? "#FF6437" : "#333", position: "relative", flexShrink: 0 }}>
                <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: skipScores ? 18 : 2, transition: "left 0.2s" }} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: skipScores ? "#FF6437" : "#888" }}>Skip scoring</div>
                <div style={{ fontSize: 11, color: "#555" }}>Feedback only — no grades or scores shown</div>
              </div>
            </div>
            <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between" }}>
              <button onClick={() => goStep(0)} style={btnS}>← Back</button>
              <button onClick={() => goStep(2)} disabled={categories.length < 2} style={categories.length >= 2 ? btnP : btnD}>Annotate Paper →</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="afi">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 1 }}>Annotate the Paper</h1>
                <p style={{ color: "#666", fontSize: 12 }}>Highlight → tag → AI fills the gaps</p>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => goStep(1)} style={btnS}>← Categories</button>
                <button onClick={() => goStep(3)} style={btnP}>Customize →</button>
              </div>
            </div>
            <PaperAnnotator paperText={paperText} categories={categories} annotations={annotations} setAnnotations={setAnnotations} categoryScores={categoryScores} setCategoryScores={setCategoryScores} onAISuggest={runAI} aiLoading={aiLoading} savedComments={savedComments} onSaveComment={handleSaveComment} skipScores={skipScores} unmatched={unmatched} setUnmatched={setUnmatched} />
          </div>
        )}

        {step === 3 && (
          <div className="af">
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "#fff", marginBottom: 4 }}>Customize the experience</h1>
            <p style={{ color: "#777", fontSize: 13, marginBottom: 28 }}>Add a personal note and choose which slides to include.</p>
            <div style={{ marginBottom: 24 }}>
              <label style={lbl}>💬 Teacher's Note (optional)</label>
              <textarea value={teacherNote} onChange={e => setTeacherNote(e.target.value)} placeholder={`Great work, ${studentName}...`}
                style={{ ...inp, minHeight: 90, lineHeight: 1.7 }} />
            </div>

            <label style={lbl}>🎞️ Slides</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
              {[
                { key: "opener", label: "Opening Title", icon: "🎬" },
                { key: "stats", label: "By the Numbers", icon: "📊" },
                { key: "paper", label: "Annotated Paper → Zoom", icon: "📜" },
                { key: "hits", label: "Greatest Hits (from paper)", icon: "🏆" },
                { key: "growth", label: "Growth Edge", icon: "🌱" },
                { key: "note", label: "Teacher's Note", icon: "💬" },
                { key: "quiz", label: "Feedback Quiz", icon: "🧠" },
                { key: "profile", label: "Writer Profile", icon: "🎭" },
              ].map(s => (
                <div key={s.key} onClick={() => setEnabledSlides(p => ({ ...p, [s.key]: !p[s.key] }))} style={{
                  padding: "10px 14px", borderRadius: 10, cursor: "pointer",
                  border: `2px solid ${enabledSlides[s.key] ? "#1DB954" : "#2a2a35"}`,
                  background: enabledSlides[s.key] ? "rgba(29,185,84,0.05)" : "#16161d",
                  display: "flex", alignItems: "center", gap: 9, transition: "all 0.2s",
                }}>
                  <span style={{ fontSize: 16 }}>{s.icon}</span>
                  <span style={{ fontWeight: 600, color: enabledSlides[s.key] ? "#fff" : "#666", fontSize: 12, flex: 1 }}>{s.label}</span>
                  <div style={{ width: 34, height: 18, borderRadius: 9, background: enabledSlides[s.key] ? "#1DB954" : "#333", position: "relative" }}>
                    <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: enabledSlides[s.key] ? 18 : 2, transition: "left 0.2s" }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between" }}>
              <button onClick={() => goStep(2)} style={btnS}>← Annotate</button>
              <button onClick={() => goStep(4)} style={btnP}>Preview & Edit →</button>
            </div>
            {/* Fix #11: Warning if no hits content */}
            {enabledSlides.hits && annotations.filter(a => a.type === "greatestHit").length === 0 && annotations.filter(a => a.type === "strength").length === 0 && (
              <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 10, background: "rgba(255,215,0,0.04)", border: "1px dashed rgba(255,215,0,0.2)", fontSize: 11, color: "#999", lineHeight: 1.6 }}>
                ⚠️ "Greatest Hits" is enabled but you haven't tagged any 🏆 or 💪 annotations yet. This slide will be empty.
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="af">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
              <div>
                <h1 style={{ fontSize: 28, fontWeight: 800, color: "#fff", marginBottom: 4 }}>Preview & Edit</h1>
                <p style={{ color: "#777", fontSize: 13 }}>See exactly what {studentName} will see. Edit anything before you deliver.</p>
              </div>
              <button onClick={launch} style={{ ...btnP, fontSize: 15, padding: "13px 36px", borderRadius: 50, boxShadow: "0 0 30px rgba(29,185,84,0.2)", flexShrink: 0 }}>▶ Deliver to Student</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Writer Profile Card */}
              <PreviewCard title="🎭 Writer Profile" enabled={enabledSlides.profile} onToggle={() => setEnabledSlides(p => ({ ...p, profile: !p.profile }))}
                bg="linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)">
                {(() => {
                  const wp = writerProfile || { title: "", strengths: ["", "", ""], style: "", growthAreas: ["", ""] };
                  const vibes = [
                    { id: "professional", label: "📐 Professional", desc: "Clean and direct" },
                    { id: "balanced", label: "✨ Balanced", desc: "Warm but grounded" },
                    { id: "whimsy", label: "🎪 Whimsy", desc: "Playful and memorable" },
                  ];
                  return (
                    <div>
                      {/* Vibe selector */}
                      <div style={{ marginBottom: 14 }}>
                        <label style={lbl}>Profile Vibe</label>
                        <div style={{ display: "flex", gap: 6 }}>
                          {vibes.map(v => (
                            <button key={v.id} onClick={() => setFeedbackVibe(v.id)} style={{
                              flex: 1, padding: "8px 6px", borderRadius: 10, cursor: "pointer",
                              border: `2px solid ${feedbackVibe === v.id ? "#1DB954" : "#222230"}`,
                              background: feedbackVibe === v.id ? "rgba(29,185,84,0.08)" : "#16161d",
                              fontFamily: "'Outfit'", textAlign: "center", transition: "all 0.15s",
                            }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: feedbackVibe === v.id ? "#fff" : "#666" }}>{v.label}</div>
                              <div style={{ fontSize: 9, color: feedbackVibe === v.id ? "#1DB954" : "#444", marginTop: 2 }}>{v.desc}</div>
                            </button>
                          ))}
                        </div>
                        <button onClick={async () => {
                          const vibeInstructions = feedbackVibe === "whimsy"
                            ? "Be playful, witty, and fun. Use creative metaphors, unexpected comparisons, humor, and personality. Make the student smile. The archetype title should be imaginative and memorable (e.g. 'The Velvet Sledgehammer', 'Footnote Wizard', 'The Quiet Storm'). The style description should be vivid and entertaining."
                            : feedbackVibe === "professional"
                            ? "Be clean, direct, and formal. Use precise academic language. The archetype should sound distinguished (e.g. 'The Analytical Mind', 'The Precise Voice'). Keep the style description crisp."
                            : "Be warm and encouraging with a touch of personality. Balance professionalism with humanity. The archetype should feel affirming (e.g. 'The Bold Thinker', 'The Rising Voice').";

                          try {
                            const res = await fetch("https://api.anthropic.com/v1/messages", {
                              method: "POST", headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 500,
                                messages: [{ role: "user", content: `Generate a writer profile for a grade ${gradeLevel} student based on their paper feedback.

${vibeInstructions}

Their strengths: ${annotations.filter(a => a.type === "strength").map(a => a.comment || a.text).join("; ")}
Their growth areas: ${annotations.filter(a => a.type === "growth").map(a => a.comment || a.text).join("; ")}
Greatest hits: ${annotations.filter(a => a.type === "greatestHit").map(a => a.text).join("; ")}

Return ONLY valid JSON: { "title": "2-4 word archetype", "strengths": ["s1","s2","s3"], "style": "one vivid sentence about their writing", "growthAreas": ["g1","g2"] }` }] }),
                            });
                            const data = await res.json();
                            const parsed = JSON.parse((data.content?.map(i => i.text || "").join("") || "").replace(/```json|```/g, "").trim());
                            setWriterProfile(parsed);
                          } catch (err) { console.error(err); }
                        }} style={{
                          marginTop: 8, padding: "6px 14px", borderRadius: 8,
                          border: "1px solid #333", background: "transparent",
                          color: "#888", fontSize: 11, cursor: "pointer", fontFamily: "'Outfit'", fontWeight: 600,
                        }}>✨ Regenerate with this vibe</button>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                      <div style={{ gridColumn: "1 / -1" }}>
                        <label style={lbl}>Archetype Title</label>
                        <input value={wp.title} onChange={e => setWriterProfile(p => ({ ...p || { strengths: [], style: "", growthAreas: [] }, title: e.target.value }))}
                          placeholder="e.g. The Bold Philosopher" style={{ ...inp, fontWeight: 700 }} />
                      </div>
                      <div style={{ gridColumn: "1 / -1" }}>
                        <label style={lbl}>Style Description</label>
                        <textarea value={wp.style} onChange={e => setWriterProfile(p => ({ ...p || { title: "", strengths: [], growthAreas: [] }, style: e.target.value }))}
                          placeholder="One vivid sentence about their writing voice..." style={{ ...inp, height: 52, resize: "none", lineHeight: 1.5 }} />
                      </div>
                      <div>
                        <label style={lbl}>Strengths (one per line)</label>
                        <textarea value={wp.strengths?.join("\n") || ""} onChange={e => setWriterProfile(p => ({ ...p || { title: "", style: "", growthAreas: [] }, strengths: e.target.value.split("\n") }))}
                          placeholder={"Clear thesis\nVivid imagery\nStrong voice"} style={{ ...inp, height: 68, resize: "none", fontSize: 12, lineHeight: 1.5 }} />
                      </div>
                      <div>
                        <label style={lbl}>Growth Areas (one per line)</label>
                        <textarea value={wp.growthAreas?.join("\n") || ""} onChange={e => setWriterProfile(p => ({ ...p || { title: "", style: "", strengths: [] }, growthAreas: e.target.value.split("\n") }))}
                          placeholder={"Evidence depth\nTransitions"} style={{ ...inp, height: 68, resize: "none", fontSize: 12, lineHeight: 1.5 }} />
                      </div>
                    </div>
                    </div>
                  );
                })()}
              </PreviewCard>

              {/* Growth Edge Card */}
              <PreviewCard title="🌱 Growth Edge" enabled={enabledSlides.growth} onToggle={() => setEnabledSlides(p => ({ ...p, growth: !p.growth }))}
                bg="linear-gradient(135deg, #2d1500 0%, #8b4000 50%, #FF6437 100%)">
                {(() => {
                  const ge = growthEdge || { area: "", explanation: "", actionSteps: ["", "", ""] };
                  return (
                    <div>
                      <div style={{ marginBottom: 10 }}>
                        <label style={lbl}>Focus Area</label>
                        <input value={ge.area} onChange={e => setGrowthEdge(p => ({ ...p || { explanation: "", actionSteps: [] }, area: e.target.value }))}
                          placeholder="e.g. Evidence Integration" style={inp} />
                      </div>
                      <div style={{ marginBottom: 10 }}>
                        <label style={lbl}>Explanation</label>
                        <textarea value={ge.explanation} onChange={e => setGrowthEdge(p => ({ ...p || { area: "", actionSteps: [] }, explanation: e.target.value }))}
                          placeholder="Why this matters for their development..." style={{ ...inp, height: 52, resize: "none", lineHeight: 1.5 }} />
                      </div>
                      <div>
                        <label style={lbl}>Action Steps (one per line)</label>
                        <textarea value={ge.actionSteps?.join("\n") || ""} onChange={e => setGrowthEdge(p => ({ ...p || { area: "", explanation: "" }, actionSteps: e.target.value.split("\n") }))}
                          placeholder={"Re-read your evidence paragraphs\nAdd one quote per body paragraph\nPractice the 'quote sandwich' technique"} style={{ ...inp, height: 68, resize: "none", fontSize: 12, lineHeight: 1.5 }} />
                      </div>
                    </div>
                  );
                })()}
              </PreviewCard>

              {/* Teacher Note Card */}
              <PreviewCard title="💬 Teacher's Note" enabled={enabledSlides.note} onToggle={() => setEnabledSlides(p => ({ ...p, note: !p.note }))}
                bg="linear-gradient(135deg, #191414 0%, #2d1b33 50%, #F573A0 100%)">
                <textarea value={teacherNote} onChange={e => setTeacherNote(e.target.value)}
                  placeholder={`A personal message for ${studentName}...`}
                  style={{ ...inp, height: 80, resize: "none", lineHeight: 1.7, fontStyle: "italic" }} />
              </PreviewCard>

              {/* Quiz Preview Card */}
              <PreviewCard title="🧠 Feedback Quiz" enabled={enabledSlides.quiz} onToggle={() => setEnabledSlides(p => ({ ...p, quiz: !p.quiz }))}
                bg="linear-gradient(135deg, #0a1628 0%, #1a3a6b 50%, #509BF5 100%)">
                {quizQuestions.length > 0 ? (
                  <div>
                    {quizQuestions.map((q, i) => (
                      <div key={i} style={{ padding: "8px 10px", borderRadius: 8, background: "rgba(80,155,245,0.06)", marginBottom: 6, borderLeft: "3px solid #509BF530" }}>
                        <div style={{ fontSize: 12, color: "#ddd", fontWeight: 600, marginBottom: 3 }}>Q{i + 1}: {q.question}</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                          {q.options.map((o, oi) => (
                            <span key={oi} style={{ fontSize: 9, padding: "2px 7px", borderRadius: 5, background: oi === q.correctIndex ? "#1DB95420" : "rgba(255,255,255,0.03)", color: oi === q.correctIndex ? "#1DB954" : "#777", fontWeight: oi === q.correctIndex ? 700 : 400 }}>{String.fromCharCode(65 + oi)}. {o}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                    <button onClick={generateQuiz} style={{ marginTop: 6, padding: "6px 14px", borderRadius: 8, border: "1px solid #333", background: "transparent", color: "#888", fontSize: 11, cursor: "pointer", fontFamily: "'Outfit'", fontWeight: 600 }}>↻ Regenerate</button>
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "10px 0" }}>
                    <p style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>
                      {annotations.filter(a => a.comment).length > 0
                        ? "Generate quiz questions from your feedback comments."
                        : "Add comments to annotations first, then generate."}
                    </p>
                    <button onClick={generateQuiz} disabled={annotations.filter(a => a.comment).length === 0 || quizLoading} style={{
                      padding: "8px 18px", borderRadius: 8, border: "none",
                      background: annotations.filter(a => a.comment).length > 0 ? "linear-gradient(135deg, #509BF5, #1DB954)" : "#2a2a35",
                      color: annotations.filter(a => a.comment).length > 0 ? "#fff" : "#555",
                      fontSize: 12, fontWeight: 700, cursor: annotations.filter(a => a.comment).length > 0 ? "pointer" : "not-allowed", fontFamily: "'Outfit'",
                    }}>{quizLoading ? "Generating..." : "✨ Generate Quiz"}</button>
                  </div>
                )}
              </PreviewCard>

              {/* Greatest Hits ordering + warning */}
              {(() => {
                const hits = annotations.filter(a => a.type === "greatestHit");
                const strengths = annotations.filter(a => a.type === "strength");
                const activeHits = hits.length > 0 ? hits : strengths.slice(0, 2);
                const moveHit = (idx, dir) => {
                  const order = hitOrder || activeHits.map(h => h.id);
                  const newOrder = [...order];
                  const [item] = newOrder.splice(idx, 1);
                  newOrder.splice(idx + dir, 0, item);
                  setHitOrder(newOrder);
                };
                const displayHits = hitOrder ? hitOrder.map(id => activeHits.find(h => h.id === id)).filter(Boolean) : activeHits;
                return enabledSlides.hits ? (
                  <div style={{ padding: "12px 14px", borderRadius: 14, border: "1px solid #222230", background: "#13131a" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#FFD700" }}>🏆 Greatest Hits ({displayHits.length})</span>
                      <div onClick={() => setEnabledSlides(p => ({ ...p, hits: !p.hits }))} style={{ width: 34, height: 18, borderRadius: 9, background: "#1DB954", position: "relative", cursor: "pointer" }}>
                        <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: 18, transition: "left 0.2s" }} />
                      </div>
                    </div>
                    {displayHits.length === 0 ? (
                      <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(255,215,0,0.05)", border: "1px dashed rgba(255,215,0,0.2)", fontSize: 11, color: "#888", lineHeight: 1.6 }}>
                        ⚠️ No greatest hits or strengths tagged yet. Go back to <span style={{ color: "#1DB954", cursor: "pointer", fontWeight: 700 }} onClick={() => goStep(2)}>Annotate</span> and tag some highlights as 🏆 Greatest Hit or 💪 Strength.
                      </div>
                    ) : (
                      <div>
                        {displayHits.map((h, i) => (
                          <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 8, marginBottom: 3, background: "rgba(255,215,0,0.03)" }}>
                            <span style={{ fontSize: 12, fontWeight: 800, color: "#FFD700", fontFamily: "'JetBrains Mono'", width: 18 }}>{i + 1}</span>
                            <span style={{ flex: 1, fontSize: 11, color: "#ccc", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>"{h.text.slice(0, 60)}{h.text.length > 60 ? "…" : ""}"</span>
                            <div style={{ display: "flex", gap: 2 }}>
                              <button disabled={i === 0} onClick={() => moveHit(i, -1)} style={{ background: "none", border: "none", color: i === 0 ? "#333" : "#888", cursor: i === 0 ? "default" : "pointer", fontSize: 10, padding: "2px 4px" }}>▲</button>
                              <button disabled={i === displayHits.length - 1} onClick={() => moveHit(i, 1)} style={{ background: "none", border: "none", color: i === displayHits.length - 1 ? "#333" : "#888", cursor: i === displayHits.length - 1 ? "default" : "pointer", fontSize: 10, padding: "2px 4px" }}>▼</button>
                            </div>
                          </div>
                        ))}
                        {hits.length === 0 && <div style={{ fontSize: 9, color: "#555", marginTop: 4 }}>Using top strengths (no 🏆 tags found). Tag annotations as Greatest Hit for more control.</div>}
                      </div>
                    )}
                  </div>
                ) : null;
              })()}

              {/* Non-editable slide summary */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {[
                  { key: "opener", label: "Opening", icon: "🎬", desc: `"${studentName}"` },
                  { key: "stats", label: "By the Numbers", icon: "📊", desc: `${computeStats(paperText).wordCount} words` },
                  { key: "paper", label: "Annotated Paper", icon: "📜", desc: `${annotations.length} highlights` },
                ].map(s => (
                  <div key={s.key} onClick={() => setEnabledSlides(p => ({ ...p, [s.key]: !p[s.key] }))} style={{
                    padding: "12px 14px", borderRadius: 12, cursor: "pointer",
                    border: `2px solid ${enabledSlides[s.key] ? "#1DB95430" : "#1e1e28"}`,
                    background: enabledSlides[s.key] ? "rgba(29,185,84,0.04)" : "#13131a",
                    opacity: enabledSlides[s.key] ? 1 : 0.45, transition: "all 0.2s",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 14 }}>{s.icon}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>{s.label}</span>
                    </div>
                    <div style={{ fontSize: 10, color: "#666" }}>{s.desc}</div>
                  </div>
                ))}
              </div>

              {/* Bottom launch */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                <button onClick={() => goStep(3)} style={btnS}>← Customize</button>
                <button onClick={launch} style={{ ...btnP, fontSize: 16, padding: "14px 40px", borderRadius: 50, boxShadow: "0 0 30px rgba(29,185,84,0.2)" }}>▶ Deliver to Student</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  WRAPPED PRESENTATION
// ═══════════════════════════════════════════════════════════════
function Wrapped({ data, onBack }) {
  const { studentName, assignmentTitle, categories, annotations, categoryScores, teacherNote, enabledSlides, stats, greatestHits, growthEdge, quizQuestions, writerProfile, paperText, skipScores } = data;
  const [cur, setCur] = useState(0);
  const [trans, setTrans] = useState(false);
  const [quizState, setQuizState] = useState({ idx: 0, answers: {}, show: false });
  const [quizDone, setQuizDone] = useState(false);
  const words = useMemo(() => splitWords(paperText), [paperText]);

  const slides = useMemo(() => {
    const s = []; let gi = 0; const bg = () => SLIDE_BGS[(gi++) % SLIDE_BGS.length];
    if (enabledSlides.opener) s.push({ type: "opener", bg: bg() });
    if (enabledSlides.stats) s.push({ type: "stats", bg: bg() });
    if (enabledSlides.paper) s.push({ type: "paper", bg: bg() });
    if (enabledSlides.hits) greatestHits?.forEach((_, i) => s.push({ type: "hit", i, bg: bg() }));
    if (enabledSlides.growth) s.push({ type: "growth", bg: bg() });
    if (enabledSlides.note && teacherNote) s.push({ type: "note", bg: bg() });
    if (enabledSlides.quiz && quizQuestions?.length) s.push({ type: "quiz", bg: bg() });
    if (enabledSlides.profile) s.push({ type: "profile", bg: bg() });
    return s;
  }, [enabledSlides, greatestHits, teacherNote, quizQuestions]);

  const go = useCallback((dir) => {
    if (trans) return; const n = cur + dir;
    if (n < 0 || n >= slides.length) return;
    setTrans(true); setTimeout(() => { setCur(n); setTimeout(() => setTrans(false), 50); }, 280);
  }, [cur, slides.length, trans]);

  useEffect(() => {
    const h = (e) => { if (e.key === "ArrowRight" || e.key === " ") go(1); if (e.key === "ArrowLeft") go(-1); };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [go]);

  const sl = slides[cur]; const progress = ((cur + 1) / slides.length) * 100;

  const render = () => {
    if (!sl) return null;
    switch (sl.type) {
      case "opener": return (
        <div style={{ textAlign: "center" }}>
          <div className="af s1" style={{ fontSize: 12, letterSpacing: 6, textTransform: "uppercase", color: "#1DB954", fontWeight: 700, marginBottom: 18 }}>Your Paper · Unwrapped</div>
          <div className="af s2" style={{ fontSize: "clamp(42px, 8vw, 78px)", fontWeight: 900, lineHeight: 1.05, color: "#fff" }}>{studentName}</div>
          <div className="af s3" style={{ fontSize: 17, color: "rgba(255,255,255,0.45)", marginTop: 8 }}>{assignmentTitle}</div>
          <div className="af s5" style={{ marginTop: 40, fontSize: 11, color: "rgba(255,255,255,0.2)", letterSpacing: 2 }}>TAP OR PRESS → TO BEGIN</div>
        </div>
      );

      case "stats": return (
        <div style={{ maxWidth: 480 }}>
          <div className="af s1" style={{ fontSize: 11, letterSpacing: 4, textTransform: "uppercase", color: "#1DB954", fontWeight: 700, marginBottom: 24 }}>By the Numbers</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18, marginBottom: 24 }}>
            {[{ l: "Words", v: stats.wordCount, d: 100 }, { l: "Sentences", v: stats.sentenceCount, d: 300 }, { l: "Unique Words", v: stats.uniqueWords, d: 500 }].map((s, i) => (
              <div key={i} className={`af s${i + 2}`} style={{ textAlign: "center" }}>
                <div style={{ fontSize: "clamp(30px, 5vw, 48px)", fontWeight: 900, color: "#fff", fontFamily: "'JetBrains Mono'" }}><AnimNum value={s.v} delay={s.d} /></div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{s.l}</div>
              </div>
            ))}
          </div>
          <div className="af s5" style={{ display: "flex", gap: 16, justifyContent: "center" }}>
            <div style={{ padding: "10px 18px", background: "rgba(255,255,255,0.05)", borderRadius: 10, textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#509BF5", fontFamily: "'JetBrains Mono'" }}>{stats.avgSentLen}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>Avg Sentence Length</div>
            </div>
            <div style={{ padding: "10px 18px", background: "rgba(255,255,255,0.05)", borderRadius: 10, textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#F573A0", fontFamily: "'JetBrains Mono'" }}>{stats.paragraphCount}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>Paragraphs</div>
            </div>
          </div>
        </div>
      );

      // ★ PAPER WITH HIGHLIGHTS → context for greatest hits
      case "paper": return <PaperRevealSlide words={words} annotations={annotations} categories={categories} />;

      // ★ ZOOMED GREATEST HIT — feels like "zooming in" from the paper
      case "hit": {
        const hit = greatestHits?.[sl.i];
        if (!hit) return null;
        const cat = categories.find(c => c.id === hit.catId);
        const hitWords = hit.text.split(/\s+/).length;
        // Scale font down for longer passages, truncate if very long
        const fontSize = hitWords > 40 ? "clamp(14px, 2vw, 18px)" : hitWords > 20 ? "clamp(16px, 2.5vw, 22px)" : "clamp(22px, 3.5vw, 34px)";
        const displayText = hitWords > 60 ? hit.text.split(/\s+/).slice(0, 50).join(" ") + "…" : hit.text;
        return (
          <div style={{ maxWidth: 580, textAlign: "center", display: "flex", flexDirection: "column", maxHeight: "80vh", justifyContent: "center" }}>
            <div className="af s1" style={{ fontSize: 11, letterSpacing: 4, textTransform: "uppercase", color: "#FFD700", fontWeight: 700, marginBottom: 14, flexShrink: 0 }}>
              🏆 Greatest Hit #{sl.i + 1}
            </div>
            <div className="azi s2" style={{
              fontSize, fontWeight: 500, color: "#fff", lineHeight: 1.6,
              fontFamily: "'Crimson Pro',Georgia,serif", fontStyle: "italic",
              padding: hitWords > 30 ? "18px 24px" : "28px 34px", borderRadius: 20, background: "rgba(255,215,0,0.06)",
              border: "1px solid rgba(255,215,0,0.15)",
              boxShadow: "0 0 60px rgba(255,215,0,0.08)",
              overflow: "hidden", flexShrink: 1, minHeight: 0,
            }}>"{displayText}"</div>
            {hit.comment && <div className="af s4" style={{ marginTop: 14, fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.5, flexShrink: 0 }}>{hit.comment}</div>}
            {cat && <div className="af s5" style={{ marginTop: 10, flexShrink: 0 }}><span style={{ padding: "5px 14px", borderRadius: 18, fontSize: 11, fontWeight: 700, background: cat.color + "20", color: cat.color }}>{cat.icon} {cat.name}</span></div>}
          </div>
        );
      }

      case "growth": return (
        <div style={{ maxWidth: 520 }}>
          <div className="af s1" style={{ fontSize: 11, letterSpacing: 4, textTransform: "uppercase", color: "#FF6437", fontWeight: 700, marginBottom: 8 }}>Your Growth Edge</div>
          <div className="af s2" style={{ fontSize: "clamp(26px, 5vw, 40px)", fontWeight: 900, color: "#fff", marginBottom: 16 }}>🌱 {growthEdge?.area}</div>
          <div className="af s3" style={{ fontSize: 15, color: "rgba(255,255,255,0.65)", lineHeight: 1.7, marginBottom: 22 }}>{growthEdge?.explanation}</div>
          {growthEdge?.actionSteps?.filter(Boolean).map((st, i) => (
            <div key={i} className={`af s${i + 4}`} style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10, padding: "11px 14px", background: "rgba(255,255,255,0.04)", borderRadius: 12 }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#FF6437", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#fff", flexShrink: 0 }}>{i + 1}</div>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>{st}</span>
            </div>
          ))}
        </div>
      );

      case "note": return (
        <div style={{ maxWidth: 480, textAlign: "center" }}>
          <div className="af s1" style={{ fontSize: 11, letterSpacing: 4, textTransform: "uppercase", color: "#F573A0", fontWeight: 700, marginBottom: 18 }}>A Note From Your Teacher</div>
          <div className="asi s2" style={{ fontSize: 40, marginBottom: 14 }}>💬</div>
          <div className="af s3" style={{ fontSize: "clamp(18px, 3vw, 24px)", color: "#fff", lineHeight: 1.8, fontFamily: "'Crimson Pro'", fontStyle: "italic" }}>"{teacherNote}"</div>
        </div>
      );

      case "quiz": return <QuizSlide q={quizQuestions} state={quizState} setState={setQuizState} done={quizDone} setDone={setQuizDone} name={studentName} />;

      case "profile": {
        const total = categories.reduce((s, c) => s + (categoryScores[c.id] || 0), 0);
        const maxTotal = categories.reduce((s, c) => s + c.maxScore, 0);
        const pct = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;
        return (
          <div style={{ textAlign: "center", maxWidth: 440 }}>
            <div className="af s1" style={{ fontSize: 11, letterSpacing: 4, textTransform: "uppercase", color: "#1DB954", fontWeight: 700, marginBottom: 14 }}>Your Writer Profile</div>
            <div className="asi s2" style={{ width: 90, height: 90, borderRadius: "50%", margin: "0 auto 14px", background: "linear-gradient(135deg,#1DB954,#509BF5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 38 }}>✍️</div>
            <div className="af s3" style={{ fontSize: "clamp(26px, 5vw, 36px)", fontWeight: 900, color: "#fff", marginBottom: 4 }}>{writerProfile?.title}</div>
            <div className="af s4" style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", fontStyle: "italic", marginBottom: 18, fontFamily: "'Crimson Pro'" }}>{writerProfile?.style}</div>
            {!skipScores && (
            <div className="asi s5" style={{ display: "inline-block", padding: "10px 22px", borderRadius: 12, background: "rgba(255,255,255,0.04)", marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 2, marginBottom: 2 }}>Overall</div>
              <div style={{ fontSize: 28, fontWeight: 900, fontFamily: "'JetBrains Mono'" }}><span style={{ color: "#1DB954" }}>{total}</span><span style={{ color: "rgba(255,255,255,0.25)", fontSize: 16 }}>/{maxTotal}</span> <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>({pct}%)</span></div>
            </div>
            )}
            <div className={`af ${skipScores ? "s5" : "s6"}`} style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
              {writerProfile?.strengths?.map((s, i) => <span key={i} style={{ padding: "4px 12px", borderRadius: 16, fontSize: 11, fontWeight: 600, background: "rgba(29,185,84,0.1)", color: "#1DB954", border: "1px solid rgba(29,185,84,0.2)" }}>{s}</span>)}
            </div>
            <div className={`af ${skipScores ? "s6" : "s7"}`} style={{ marginTop: 24, fontSize: 12, color: "rgba(255,255,255,0.18)" }}>{studentName} · {assignmentTitle} · PaperWrapped</div>
          </div>
        );
      }
      default: return null;
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: sl?.bg || "#0a0a0a", fontFamily: "'Outfit'", transition: "background 0.7s", display: "flex", flexDirection: "column" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "rgba(255,255,255,0.06)", zIndex: 10 }}>
        <div style={{ height: "100%", background: "#1DB954", width: `${progress}%`, transition: "width 0.4s" }} />
      </div>
      <button onClick={onBack} style={{ position: "absolute", top: 12, left: 14, zIndex: 10, background: "rgba(255,255,255,0.08)", border: "none", color: "#fff", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 11, fontFamily: "'Outfit'", fontWeight: 600, backdropFilter: "blur(8px)" }}>← Back</button>
      <div style={{ position: "absolute", top: 14, right: 16, zIndex: 10, fontSize: 11, color: "rgba(255,255,255,0.25)", fontFamily: "'JetBrains Mono'" }}>{cur + 1}/{slides.length}</div>
      <div onClick={() => go(1)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "56px 32px 76px", opacity: trans ? 0 : 1, transition: "opacity 0.28s", cursor: "pointer" }}>
        <div key={cur} style={{ width: "100%", maxWidth: 660, margin: "0 auto" }}>{render()}</div>
      </div>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 14, padding: "16px", background: "linear-gradient(transparent, rgba(0,0,0,0.35))" }}>
        <button onClick={e => { e.stopPropagation(); go(-1); }} disabled={cur === 0} style={navBtn(cur > 0)}>←</button>
        <div style={{ display: "flex", gap: 3 }}>{slides.map((_, i) => <div key={i} style={{ width: i === cur ? 16 : 4, height: 4, borderRadius: 2, background: i === cur ? "#1DB954" : i < cur ? "rgba(29,185,84,0.3)" : "rgba(255,255,255,0.12)", transition: "all 0.3s" }} />)}</div>
        <button onClick={e => { e.stopPropagation(); go(1); }} disabled={cur === slides.length - 1} style={navBtn(cur < slides.length - 1)}>→</button>
      </div>
    </div>
  );
}

// ─── PAPER REVEAL SLIDE ───────────────────────────────────────
function PaperRevealSlide({ words, annotations, categories }) {
  const [revealed, setRevealed] = useState(0);
  const [activeAnn, setActiveAnn] = useState(null);
  const [tooltipPos, setTooltipPos] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (revealed < annotations.length) {
      const t = setTimeout(() => setRevealed(r => r + 1), 400);
      return () => clearTimeout(t);
    }
  }, [revealed, annotations.length]);

  // Fix #14: Auto-scroll to latest revealed annotation
  useEffect(() => {
    if (revealed > 0 && revealed <= annotations.length && scrollRef.current) {
      const ann = annotations[revealed - 1];
      // Find approximate scroll position based on word index ratio
      const ratio = ann.start / words.length;
      const el = scrollRef.current;
      el.scrollTo({ top: ratio * el.scrollHeight - el.clientHeight / 3, behavior: "smooth" });
    }
  }, [revealed, annotations, words.length]);

  const hitAnns = annotations.filter(a => a.type === "greatestHit");
  const allRevealed = revealed >= annotations.length;

  const handleHighlightClick = (e, ann) => {
    e.stopPropagation();
    if (activeAnn?.id === ann.id) { setActiveAnn(null); setTooltipPos(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    setActiveAnn(ann);
    setTooltipPos({ x: Math.min(rect.left, window.innerWidth - 310), y: rect.bottom + 6 });
  };

  const wordAnnMap = useMemo(() => {
    const map = {};
    for (let a = 0; a < Math.min(revealed, annotations.length); a++) {
      const ann = annotations[a];
      for (let i = ann.start; i <= ann.end; i++) {
        if (!map[i]) map[i] = ann;
      }
    }
    return map;
  }, [revealed, annotations]);

  // Fix #4: Memoize span building
  const spans = useMemo(() => {
    const spans = [];
    let i = 0;
    while (i < words.length) {
      const ann = wordAnnMap[i];
      if (ann) {
        const start = i;
        while (i < words.length && wordAnnMap[i]?.id === ann.id) i++;
        const text = words.slice(start, i).map((w, wi) => {
          const brk = w.space.includes("\n");
          return { word: w.word, brk, trailing: wi < (i - start - 1) };
        });
        spans.push({ type: "highlight", ann, words: text, start, end: i - 1 });
        const lastWord = words[i - 1];
        if (lastWord.space.includes("\n")) spans.push({ type: "break" });
        else if (lastWord.space) spans.push({ type: "space" });
      } else {
        const w = words[i];
        const brk = w.space.includes("\n");
        spans.push({ type: "word", word: w.word });
        if (brk) spans.push({ type: "break" });
        else if (w.space) spans.push({ type: "space" });
        i++;
      }
    }
    return spans;
  }, [wordAnnMap, words]);

  return (
    <div style={{ maxWidth: 620, maxHeight: expanded ? "85vh" : "65vh", overflowY: "auto", position: "relative", transition: "max-height 0.3s" }} ref={scrollRef} onClick={(e) => { e.stopPropagation(); }}>
      <div className="af s1" style={{ fontSize: 11, letterSpacing: 4, textTransform: "uppercase", color: "#509BF5", fontWeight: 700, marginBottom: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>📜 Your Paper, Annotated</span>
        <button onClick={(e) => { e.stopPropagation(); setExpanded(p => !p); }} style={{ background: "rgba(255,255,255,0.06)", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 9, padding: "3px 8px", borderRadius: 6, cursor: "pointer", fontFamily: "'Outfit'", fontWeight: 600 }}>
          {expanded ? "⊖ Compact" : "⊕ Expand"}
        </button>
      </div>
      <div className="af s2" style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginBottom: 14 }}>
        {allRevealed ? "Click any highlight to see feedback" : "Watch your highlights appear..."}
        {allRevealed && hitAnns.length > 0 ? " · Greatest hits next →" : ""}
      </div>
      <div style={{ fontSize: 15, lineHeight: 2.1, color: "rgba(255,255,255,0.6)", fontFamily: "'Crimson Pro',Georgia,serif" }}>
        {spans.map((span, si) => {
          if (span.type === "break") return <span key={si}><br /><br /></span>;
          if (span.type === "space") return <span key={si}> </span>;
          if (span.type === "word") return <span key={si}>{span.word}</span>;
          if (span.type === "highlight") {
            const t = ANNOTATION_TYPES.find(t => t.id === span.ann.type);
            const color = t?.color || "#1DB954";
            const isActive = activeAnn?.id === span.ann.id;
            return (
              <span key={si}
                onClick={(e) => handleHighlightClick(e, span.ann)}
                style={{
                  backgroundColor: isActive ? color + "45" : color + "28",
                  borderBottom: `2px solid ${color}`,
                  borderRadius: 3, padding: "2px 1px",
                  transition: "all 0.3s",
                  color: "#fff",
                  cursor: allRevealed ? "pointer" : "default",
                  outline: isActive ? `1px solid ${color}60` : "none",
                  outlineOffset: 2,
                }}
              >
                {span.words.map((w, wi) => (
                  <span key={wi}>
                    {w.word}
                    {w.brk ? null : (w.trailing ? " " : "")}
                  </span>
                ))}
              </span>
            );
          }
          return null;
        })}
      </div>

      {/* Comment tooltip */}
      {activeAnn && tooltipPos && (
        <div style={{
          position: "fixed", left: Math.min(tooltipPos.x, window.innerWidth - 300), top: Math.min(tooltipPos.y, window.innerHeight - 180),
          width: 290, background: "#1a1a26", border: "1px solid #333345", borderRadius: 14,
          padding: 14, zIndex: 100, boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
          animation: "fadeInUp 0.2s ease forwards",
        }} onClick={e => e.stopPropagation()}>
          {/* Type + Category header */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <span style={{ fontSize: 14 }}>{ANNOTATION_TYPES.find(t => t.id === activeAnn.type)?.emoji}</span>
            <span style={{
              fontSize: 11, fontWeight: 700,
              color: ANNOTATION_TYPES.find(t => t.id === activeAnn.type)?.color,
            }}>{ANNOTATION_TYPES.find(t => t.id === activeAnn.type)?.label}</span>
            <span style={{ color: "#333", fontSize: 10 }}>·</span>
            {(() => {
              const cat = categories.find(c => c.id === activeAnn.catId);
              return cat ? <span style={{ fontSize: 10, color: cat.color, fontWeight: 600 }}>{cat.icon} {cat.name}</span> : null;
            })()}
            {/* Source badge hidden from students */}
          </div>
          {/* The highlighted text */}
          <div style={{
            fontSize: 13, color: "rgba(255,255,255,0.75)", fontStyle: "italic",
            fontFamily: "'Crimson Pro',Georgia,serif", lineHeight: 1.5,
            padding: "8px 10px", background: "rgba(255,255,255,0.04)", borderRadius: 8,
            marginBottom: activeAnn.comment ? 8 : 0,
            borderLeft: `3px solid ${ANNOTATION_TYPES.find(t => t.id === activeAnn.type)?.color || "#1DB954"}`,
          }}>
            "{activeAnn.text.length > 120 ? activeAnn.text.slice(0, 120) + "…" : activeAnn.text}"
          </div>
          {/* Teacher comment */}
          {activeAnn.comment && (
            <div style={{
              fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 1.6,
              fontFamily: "'Outfit'",
            }}>
              {activeAnn.comment}
            </div>
          )}
          {/* No comment fallback */}
          {!activeAnn.comment && (
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontStyle: "italic", marginTop: 4 }}>
              No additional comment
            </div>
          )}
          {/* Close hint */}
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.15)", marginTop: 8, textAlign: "center" }}>
            click highlight again to close
          </div>
        </div>
      )}
    </div>
  );
}

// ─── QUIZ SLIDE ───────────────────────────────────────────────
function QuizSlide({ q, state, setState, done, setDone, name }) {
  if (!q?.length) return null;
  const { idx, answers, show } = state;
  const qq = q[idx];
  const pick = (i) => { if (answers[idx] !== undefined) return; setState(p => ({ ...p, answers: { ...p.answers, [idx]: i }, show: true })); };
  const next = () => { if (idx + 1 >= q.length) setDone(true); else setState(p => ({ ...p, idx: p.idx + 1, show: false })); };
  const skip = (e) => { e.stopPropagation(); setDone(true); };
  if (done) {
    const answered = Object.keys(answers).length;
    const correct = q.filter((x, i) => answers[i] === x.correctIndex).length;
    return (<div style={{ textAlign: "center", maxWidth: 400 }}>
      <div className="asi s1" style={{ fontSize: 44, marginBottom: 10 }}>{answered === 0 ? "⏭️" : correct === q.length ? "🎉" : "👏"}</div>
      <div className="af s2" style={{ fontSize: 30, fontWeight: 900, color: "#fff" }}>{answered === 0 ? "Skipped" : `${correct}/${q.length}`}</div>
      <div className="af s3" style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginTop: 6, lineHeight: 1.6 }}>{answered === 0 ? "No worries — you can review the feedback anytime." : correct === q.length ? `Perfect, ${name}!` : "Good effort! The areas you missed are your growth edges."}</div>
    </div>);
  }
  return (
    <div style={{ maxWidth: 500 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
        <div className="af s1" style={{ fontSize: 11, letterSpacing: 4, textTransform: "uppercase", color: "#509BF5", fontWeight: 700 }}>🧠 {idx + 1}/{q.length}</div>
        <button onClick={skip} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.2)", fontSize: 10, cursor: "pointer", fontFamily: "'Outfit'", fontWeight: 600, padding: "4px 8px" }}>Skip quiz →</button>
      </div>
      <div className="af s2" style={{ fontSize: "clamp(17px, 2.5vw, 23px)", fontWeight: 700, color: "#fff", lineHeight: 1.5, marginBottom: 18 }}>{qq.question}</div>
      {qq.options.map((o, i) => {
        const done = answers[idx] !== undefined; const sel = answers[idx] === i; const cor = i === qq.correctIndex;
        let bg = "rgba(255,255,255,0.04)", bd = "rgba(255,255,255,0.06)";
        if (done && cor) { bg = "rgba(29,185,84,0.16)"; bd = "#1DB954"; }
        else if (done && sel) { bg = "rgba(232,17,91,0.16)"; bd = "#E8115B"; }
        return (<div key={i} onClick={e => { e.stopPropagation(); pick(i); }} className={`af s${i + 3}`} style={{ padding: "12px 16px", borderRadius: 11, cursor: done ? "default" : "pointer", background: bg, border: `2px solid ${bd}`, marginBottom: 7, display: "flex", alignItems: "center", gap: 11, transition: "all 0.2s" }}>
          <div style={{ width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, background: done && cor ? "#1DB954" : done && sel ? "#E8115B" : "rgba(255,255,255,0.06)", color: "#fff", flexShrink: 0 }}>{done && cor ? "✓" : done && sel ? "✗" : String.fromCharCode(65 + i)}</div>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.75)" }}>{o}</span>
        </div>);
      })}
      {show && (<div style={{ marginTop: 14 }}>
        <div className="afi" style={{ padding: "10px 14px", borderRadius: 10, background: answers[idx] === qq.correctIndex ? "rgba(29,185,84,0.07)" : "rgba(232,17,91,0.07)", fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>{qq.explanation}</div>
        <button onClick={e => { e.stopPropagation(); next(); }} style={{ marginTop: 8, padding: "9px 22px", borderRadius: 22, border: "none", background: "#1DB954", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Outfit'" }}>{idx + 1 >= q.length ? "Results →" : "Next →"}</button>
      </div>)}
    </div>
  );
}

// ─── DELIVERY SCREEN ──────────────────────────────────────────
function DeliveryScreen({ data, onPreview, onBack }) {
  const [shareId, setShareId] = useState(null);
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(true);

  useEffect(() => {
    const save = async () => {
      try {
        const id = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
        const url = window.location.href.split("#")[0] + "#wrapped=" + id;
        await window.storage.set("wrapped:" + id, JSON.stringify(data), true);
        setShareId(id);
        setShareUrl(url);
      } catch (err) {
        console.error("Storage error:", err);
        // Fallback: still generate a preview-only experience
        const id = "preview";
        setShareId(id);
        setShareUrl("");
      }
      setSaving(false);
    };
    save();
  }, [data]);

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{ fontFamily: "'Outfit'", background: "#0f0f13", minHeight: "100vh", color: "#e0e0e0", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", maxWidth: 520, padding: "40px 30px" }}>
        {saving ? (
          <div>
            <span style={{ display: "inline-block", width: 24, height: 24, border: "3px solid #1DB954", borderTopColor: "transparent", borderRadius: "50%", animation: "spin .7s linear infinite" }} />
            <div style={{ marginTop: 16, fontSize: 15, color: "#888" }}>Preparing delivery...</div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 52, marginBottom: 16 }}>🎉</div>
            <h1 style={{ fontSize: 32, fontWeight: 900, color: "#fff", marginBottom: 6 }}>Ready for {data.studentName}</h1>
            <p style={{ color: "#777", fontSize: 14, marginBottom: 32 }}>{data.assignmentTitle} · {data.annotations.length} annotations · PaperWrapped</p>

            {/* QR Code - generated client-side */}
            {shareUrl && (
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: "inline-block", padding: 16, background: "#fff", borderRadius: 16, marginBottom: 12 }}>
                  <QRCodeSVG text={shareUrl} size={200} fg="#111" bg="#fff" />
                </div>
                <div style={{ fontSize: 12, color: "#555" }}>Student scans to open their Wrapped</div>
              </div>
            )}

            {/* Shareable link */}
            {shareUrl && (
              <div style={{ marginBottom: 28 }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 0, borderRadius: 12, overflow: "hidden",
                  border: "2px solid #222230", background: "#16161d", maxWidth: 440, margin: "0 auto",
                }}>
                  <div style={{
                    flex: 1, padding: "12px 14px", fontSize: 12, color: "#888", fontFamily: "'JetBrains Mono'",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "left",
                  }}>{shareUrl}</div>
                  <button onClick={copyLink} style={{
                    padding: "12px 20px", border: "none", borderLeft: "2px solid #222230",
                    background: copied ? "#1DB954" : "#1e1e28", color: copied ? "#fff" : "#aaa",
                    fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Outfit'",
                    transition: "all 0.2s", whiteSpace: "nowrap",
                  }}>{copied ? "✓ Copied!" : "📋 Copy Link"}</button>
                </div>
                <div style={{ fontSize: 11, color: "#444", marginTop: 8 }}>Paste into Google Classroom, Canvas, email — anywhere</div>
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={onPreview} style={{
                padding: "13px 28px", borderRadius: 50, border: "none",
                background: "#1DB954", color: "#fff", fontSize: 14, fontWeight: 700,
                cursor: "pointer", fontFamily: "'Outfit'",
                boxShadow: "0 0 30px rgba(29,185,84,0.2)",
              }}>👁️ Preview as Student</button>
              <button onClick={onBack} style={{
                padding: "13px 28px", borderRadius: 50,
                border: "2px solid #2a2a35", background: "transparent",
                color: "#888", fontSize: 14, fontWeight: 600,
                cursor: "pointer", fontFamily: "'Outfit'",
              }}>← Edit More</button>
            </div>

            {!shareUrl && (
              <div style={{ marginTop: 20, padding: "10px 16px", borderRadius: 10, background: "rgba(255,100,55,0.08)", border: "1px solid rgba(255,100,55,0.2)", fontSize: 12, color: "#FF6437" }}>
                Storage unavailable — use "Preview as Student" to view. Sharing requires the hosted version.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── STYLES ───────────────────────────────────────────────────
const lbl = { display: "block", fontSize: 10, fontWeight: 700, color: "#666", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 };
const inp = { width: "100%", padding: "11px 13px", borderRadius: 10, border: "2px solid #222230", background: "#16161d", color: "#e0e0e0", fontSize: 14, fontFamily: "'Outfit'" };
const btnP = { padding: "11px 26px", borderRadius: 10, border: "none", background: "#1DB954", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Outfit'" };
const btnS = { padding: "11px 22px", borderRadius: 10, border: "2px solid #2a2a35", background: "transparent", color: "#888", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Outfit'" };
const btnD = { ...btnP, background: "#2a2a35", color: "#555", cursor: "not-allowed" };
const navBtn = (on) => ({ width: 38, height: 38, borderRadius: "50%", border: "none", background: on ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.03)", color: on ? "#fff" : "rgba(255,255,255,0.12)", cursor: on ? "pointer" : "default", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center" });

export default function App() {
  const [view, setView] = useState("loading");
  const [data, setData] = useState(null);

  // Check for shared wrapped link on load
  useEffect(() => {
    const checkShared = async () => {
      const hash = window.location.hash;
      const match = hash.match(/#wrapped=(.+)/);
      if (match) {
        try {
          const result = await window.storage.get("wrapped:" + match[1], true);
          if (result?.value) {
            setData(JSON.parse(result.value));
            setView("wrapped");
            return;
          }
        } catch (err) {
          console.error("Failed to load shared wrapped:", err);
        }
      }
      setView("dashboard");
    };
    checkShared();
  }, []);

  if (view === "loading") return (
    <div style={{ fontFamily: "'Outfit'", background: "#0f0f13", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ display: "inline-block", width: 20, height: 20, border: "3px solid #1DB954", borderTopColor: "transparent", borderRadius: "50%", animation: "spin .7s linear infinite" }} />
    </div>
  );
  if (view === "wrapped" && data) return <Wrapped data={data} onBack={() => { window.location.hash = ""; setView("dashboard"); }} />;
  if (view === "delivered" && data) return <DeliveryScreen data={data} onPreview={() => setView("wrapped")} onBack={() => setView("dashboard")} />;
  return <Dashboard onLaunch={d => { setData(d); setView("delivered"); }} />;
}
