import { useState } from "react";

const SEV_META = {
  error:   { label: "Error",   color: "#ef4444", bg: "#2d1010" },
  warning: { label: "Warning", color: "#f59e0b", bg: "#2d1e08" },
  info:    { label: "Info",    color: "#3b82f6", bg: "#0d1f38" },
};

const CAT_COLORS = {
  seo:    "#6366f1",
  geo:    "#06b6d4",
  eeat:   "#f59e0b",
  schema: "#10b981",
};

export default function IssuesList({ issues }) {
  const [expanded, setExpanded] = useState({});

  if (!issues || issues.length === 0) {
    return (
      <div className="no-issues">
        <span>🎉</span> No issues found — content looks great!
      </div>
    );
  }

  return (
    <div className="issues-list">
      {issues.map((issue, i) => {
        const sev      = SEV_META[issue.severity] || SEV_META.info;
        const catColor = CAT_COLORS[issue.category] || "#64748b";
        const isOpen   = expanded[i];

        return (
          <div key={i} className="issue-card"
            style={{ borderLeftColor: sev.color, background: sev.bg }}
            onClick={() => setExpanded((p) => ({ ...p, [i]: !p[i] }))}>
            <div className="issue-header">
              <span className="issue-sev-dot"   style={{ background: sev.color }} />
              <span className="issue-sev-label" style={{ color: sev.color }}>{sev.label}</span>
              <span className="issue-cat"       style={{ color: catColor }}>{issue.category?.toUpperCase()}</span>
              <span className="issue-message">{issue.message}</span>
              <span className="issue-chevron">{isOpen ? "▲" : "▼"}</span>
            </div>
            {isOpen && (
              <div className="issue-fix">
                <span className="fix-label">Fix: </span>{issue.fix}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
