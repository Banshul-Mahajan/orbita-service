import { useState, useRef } from "react";

const CONTENT_TYPES = [
  { value: "article", label: "Article" },
  { value: "faq",     label: "FAQ" },
  { value: "howto",   label: "How-To Guide" },
];

export default function InputPanel({ onAnalyze, loading }) {
  const [mode, setMode]         = useState("text");
  const [text, setText]         = useState("");
  const [url, setUrl]           = useState("");
  const [file, setFile]         = useState(null);
  const [keyword, setKeyword]   = useState("");
  const [authorName, setAuthor] = useState("");
  const [ctype, setCtype]       = useState("article");
  const fileRef = useRef(null);

  function handleSubmit(e) {
    e.preventDefault();
    if (mode === "text")  onAnalyze({ mode, content: text, keyword, contentType: ctype, authorName });
    if (mode === "url")   onAnalyze({ mode, url, keyword, contentType: ctype });
    if (mode === "file")  onAnalyze({ mode, file, keyword, contentType: ctype });
  }

  const isDisabled = loading ||
    (mode === "text" && !text.trim()) ||
    (mode === "url"  && !url.trim())  ||
    (mode === "file" && !file);

  return (
    <form className="input-panel" onSubmit={handleSubmit}>
      <div className="panel-header">
        <span className="panel-logo">⬡ OPTIMIZE ORBIT</span>
        <span className="panel-tagline">On-Page Intelligence Layer</span>
      </div>

      <div className="mode-tabs">
        {["text", "url", "file"].map((m) => (
          <button key={m} type="button"
            className={`mode-tab ${mode === m ? "active" : ""}`}
            onClick={() => setMode(m)}>
            {m === "text" ? "✏️ Text" : m === "url" ? "🔗 URL" : "📄 File"}
          </button>
        ))}
      </div>

      <div className="input-area">
        {mode === "text" && (
          <textarea
            className="content-textarea"
            placeholder="Paste your content here (Markdown supported)…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={14}
          />
        )}

        {mode === "url" && (
          <div className="url-input-wrap">
            <input
              className="url-input"
              type="url"
              placeholder="https://example.com/your-article"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <p className="hint">The page will be fetched and analysed automatically.</p>
          </div>
        )}

        {mode === "file" && (
          <div
            className={`drop-zone ${file ? "has-file" : ""}`}
            onClick={() => fileRef.current.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files[0];
              if (f) setFile(f);
            }}>
            <input ref={fileRef} type="file" accept=".txt,.md"
              style={{ display: "none" }}
              onChange={(e) => setFile(e.target.files[0])} />
            {file ? (
              <>
                <span className="file-icon">📄</span>
                <span className="file-name">{file.name}</span>
                <button type="button" className="remove-file"
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}>✕</button>
              </>
            ) : (
              <>
                <span className="drop-icon">⬆</span>
                <span>Drop .txt or .md file here, or click to browse</span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="settings-grid">
        <div className="setting-group">
          <label className="setting-label">Target Keyword</label>
          <input className="setting-input" type="text"
            placeholder="e.g. python web scraping"
            value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        </div>

        {mode === "text" && (
          <div className="setting-group">
            <label className="setting-label">Author Name</label>
            <input className="setting-input" type="text"
              placeholder="e.g. Jane Smith"
              value={authorName} onChange={(e) => setAuthor(e.target.value)} />
          </div>
        )}

        <div className="setting-group">
          <label className="setting-label">Content Type</label>
          <select className="setting-input" value={ctype}
            onChange={(e) => setCtype(e.target.value)}>
            {CONTENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      <button className="analyze-btn" type="submit" disabled={isDisabled}>
        {loading
          ? <><span className="btn-spinner" /> Analysing…</>
          : <>⬡ Analyse Content</>}
      </button>
    </form>
  );
}
