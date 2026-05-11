const CATEGORY_META = {
  seo:    { label: "SEO",     color: "#6366f1", icon: "🔍" },
  geo:    { label: "GEO",     color: "#06b6d4", icon: "🌐" },
  eeat:   { label: "E-E-A-T", color: "#f59e0b", icon: "🏅" },
  schema: { label: "Schema",  color: "#10b981", icon: "📄" },
};

export default function SubScores({ scores }) {
  return (
    <div className="sub-scores">
      {Object.entries(scores).map(([key, value]) => {
        const meta = CATEGORY_META[key] || { label: key, color: "#64748b", icon: "•" };
        return (
          <div key={key} className="sub-score-row">
            <span className="sub-score-icon">{meta.icon}</span>
            <span className="sub-score-label">{meta.label}</span>
            <div className="sub-score-bar-bg">
              <div className="sub-score-bar-fill"
                style={{ width: `${value}%`, background: meta.color, transition: "width 1s ease" }} />
            </div>
            <span className="sub-score-value">{value}</span>
          </div>
        );
      })}
    </div>
  );
}
