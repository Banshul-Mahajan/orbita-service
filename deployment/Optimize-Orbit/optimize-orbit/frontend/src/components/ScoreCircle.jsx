export default function ScoreCircle({ score }) {
  const R       = 54;
  const circumf = 2 * Math.PI * R;
  const offset  = circumf - (score / 100) * circumf;
  const color   = score >= 75 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";
  const label   = score >= 75 ? "Good" : score >= 50 ? "Needs Work" : "Poor";

  return (
    <div className="score-circle-wrap">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={R} fill="none" stroke="#1e2d45" strokeWidth="10" />
        <circle cx="70" cy="70" r={R} fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={circumf} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 70 70)"
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)" }} />
      </svg>
      <div className="score-inner">
        <span className="score-number" style={{ color }}>{score}</span>
        <span className="score-label"  style={{ color }}>{label}</span>
      </div>
    </div>
  );
}
