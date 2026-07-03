const fs = require('fs');
let code = fs.readFileSync('src/components/workspaces/parser/ParseTablePanel.tsx', 'utf8');

const metadataUI = `        <div style={{ flex: 1 }} />
        {simulation?.metadata && (
          <div style={{
            display: 'flex', gap: '16px', fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)'
          }}>
            <span title={simulation.metadata.educationalDescription}>
              Complexity: <b style={{color: 'var(--text-primary)'}}>{simulation.metadata.complexity}</b>
            </span>
            <span title="Deterministic">Det: <b style={{color: 'var(--text-primary)'}}>{simulation.metadata.deterministic ? 'Yes' : 'No'}</b></span>
            <span title="Requires CNF">CNF: <b style={{color: 'var(--text-primary)'}}>{simulation.metadata.requiresCNF ? 'Yes' : 'No'}</b></span>
            <span title="Supports Ambiguity">Ambiguity: <b style={{color: 'var(--text-primary)'}}>{simulation.metadata.supportsAmbiguity ? 'Yes' : 'No'}</b></span>
          </div>
        )}`;

// Insert before the closing div of the header toolbar
const toolbarRegex = /<\/button>\s*<span style=\{\{\s*width: '1px',\s*height: '16px',\s*background: 'var\(--border-subtle\)'\s*\}\}\s*\/>\s*\{renderConflictWarning\(\)\}\s*<\/div>/;

const match = toolbarRegex.exec(code);
if (match) {
  code = code.replace(match[0], match[0].replace('</div>', metadataUI + '\n      </div>'));
} else {
  // alternative location if the above fails
  const viewModeRegex = /{simulation\?.presentation\?.automatonVisible && \(/;
  code = code.replace(viewModeRegex, metadataUI + '\n        {simulation?.presentation?.automatonVisible && (');
}

fs.writeFileSync('src/components/workspaces/parser/ParseTablePanel.tsx', code);
