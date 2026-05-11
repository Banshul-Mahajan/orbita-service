import { useState } from "react";

export default function SchemaViewer({ schemaJson, schemaType }) {
  const [copied, setCopied] = useState(false);

  const formatted  = JSON.stringify(schemaJson, null, 2);
  const scriptTag  = `<script type="application/ld+json">\n${formatted}\n<\/script>`;

  function handleCopy() {
    navigator.clipboard.writeText(scriptTag);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="schema-viewer">
      <div className="schema-header">
        <span className="schema-type-badge">{schemaType?.toUpperCase()} SCHEMA</span>
        <button className="copy-btn" onClick={handleCopy}>
          {copied ? "✓ Copied!" : "Copy <script> Tag"}
        </button>
      </div>
      <pre className="schema-code">{formatted}</pre>
    </div>
  );
}
