import { useState } from "react";
import ScoreCircle  from "./ScoreCircle";
import SubScores    from "./SubScores";
import IssuesList   from "./IssuesList";
import SchemaViewer from "./SchemaViewer";

const TABS = ["overview", "issues", "schema", "details"];

export default function ResultsPanel({ results }) {
  const [tab, setTab] = useState("overview");

  const {
    overall_score, scores, issues,
    schema_json, schema_type,
    details, scraped_title, filename,
  } = results;

  const errCount  = issues.filter((i) => i.severity === "error").length;
  const warnCount = issues.filter((i) => i.severity === "warning").length;

  return (
    <div className="results-panel">
      {(scraped_title || filename) && (
        <div className="results-source">
          {scraped_title ? `🔗 ${scraped_title}` : `📄 ${filename}`}
        </div>
      )}

      <div className="results-tabs">
        {TABS.map((t) => (
          <button key={t}
            className={`results-tab ${tab === t ? "active" : ""}`}
            onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {t === "issues" && issues.length > 0 && (
              <span className="issues-badge">{issues.length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="results-content">

        {tab === "overview" && (
          <div className="overview-layout">
            <div className="overview-left">
              <p className="section-title">Overall Score</p>
              <ScoreCircle score={overall_score} />
              <div className="score-summary">
                {errCount  > 0 && <span className="sev-chip error">{errCount} error{errCount !== 1 ? "s" : ""}</span>}
                {warnCount > 0 && <span className="sev-chip warning">{warnCount} warning{warnCount !== 1 ? "s" : ""}</span>}
                {errCount === 0 && warnCount === 0 && <span className="sev-chip ok">All clear ✓</span>}
              </div>
            </div>
            <div className="overview-right">
              <p className="section-title">Sub-Scores</p>
              <SubScores scores={scores} />
            </div>
          </div>
        )}

        {tab === "issues" && <IssuesList issues={issues} />}

        {tab === "schema" && (
          <SchemaViewer schemaJson={schema_json} schemaType={schema_type} />
        )}

        {tab === "details" && (
          <div className="details-grid">
            {Object.entries(details).map(([key, val]) => (
              <div key={key} className="detail-card">
                <p className="detail-category">{key.toUpperCase()}</p>
                {Object.entries(val).map(([k, v]) => (
                  <div key={k} className="detail-row">
                    <span className="detail-key">{k.replace(/_/g, " ")}</span>
                    <span className="detail-val">
                      {Array.isArray(v)
                        ? v.join(", ") || "—"
                        : typeof v === "boolean"
                        ? v ? "✓ Yes" : "✗ No"
                        : String(v)}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
