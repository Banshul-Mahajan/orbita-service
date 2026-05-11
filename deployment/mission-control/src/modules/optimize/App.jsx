import { useState } from "react";
import InputPanel   from "./components/InputPanel";
import ResultsPanel from "./components/ResultsPanel";
import { analyzeText, analyzeUrl, analyzeFile } from "./api";

export default function App() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error,   setError]   = useState(null);

  async function handleAnalyze({ mode, content, file, url, keyword, contentType, authorName }) {
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      let data;
      if (mode === "text")
        data = await analyzeText({ content, target_keyword: keyword, content_type: contentType, author_name: authorName });
      else if (mode === "url")
        data = await analyzeUrl({ url, target_keyword: keyword, content_type: contentType });
      else if (mode === "file")
        data = await analyzeFile({ file, target_keyword: keyword, content_type: contentType });
      setResults(data);
    } catch (e) {
      setError(e.message || "Analysis failed. Check the Optimize backend is running on port 8004.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <div className="left-col">
        <InputPanel onAnalyze={handleAnalyze} loading={loading} />
      </div>

      <div className="right-col">
        {!results && !loading && !error && (
          <div className="empty-state">
            <div className="empty-graphic">
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                <circle cx="40" cy="40" r="36" stroke="#1e2d45" strokeWidth="4" />
                <circle cx="40" cy="40" r="24" stroke="#1e2d45" strokeWidth="3" />
                <circle cx="40" cy="40" r="4"  fill="#1e2d45" />
              </svg>
            </div>
            <p>Paste content, upload a .txt / .md file,<br />or enter a URL to begin.</p>
          </div>
        )}

        {loading && (
          <div className="loading-state">
            <div className="loading-ring" />
            <p>Analysing content…</p>
          </div>
        )}

        {error && (
          <div className="error-state">
            <span>⚠</span>
            <p>{error}</p>
          </div>
        )}

        {results && !loading && <ResultsPanel results={results} />}
      </div>
    </div>
  );
}
