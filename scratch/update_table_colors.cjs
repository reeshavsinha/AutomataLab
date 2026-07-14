const fs = require('fs');

let code = fs.readFileSync('src/components/workspaces/parser/ParseTablePanel.tsx', 'utf8');

// TH_STYLE
code = code.replace(
  `background: '#1a1f2a',\n    fontFamily: 'var(--font-mono)',\n    fontSize: '0.75rem',\n    fontWeight: 700,\n    color: '#c9d1d9',`,
  `background: 'var(--trace-bg, var(--bg-secondary))',\n    fontFamily: 'var(--font-mono)',\n    fontSize: '0.75rem',\n    fontWeight: 700,\n    color: 'var(--text-primary)',`
);

// TD_STYLE
code = code.replace(
  `border: '1px solid #21262d',`,
  `border: '1px solid var(--border-subtle)',`
);

// renderLL1Table
code = code.replace(
  `background: '#1a1f2a'`,
  `background: 'var(--trace-bg, var(--bg-secondary))'`
);
code = code.replace(
  `color: '#f97316'`,
  `color: 'var(--orange-500, #f97316)'`
);
code = code.replace(
  `color: isConflict ? '#f87171' : '#e6edf3'`,
  `color: isConflict ? 'var(--danger)' : 'var(--text-primary)'`
);

// renderLRTable empty state
code = code.replace(
  `color: '#6e7681'`,
  `color: 'var(--text-muted)'`
);

// actionDividerStyle
code = code.replace(
  `borderLeft: '2px solid #4b5563'`,
  `borderLeft: '2px solid var(--border-default)'`
);

// renderLRTable Row 1
code = code.replace(
  `background: '#1a1f2a',`,
  `background: 'var(--trace-bg, var(--bg-secondary))',`
);

// terminals map inside LR table
code = code.replace(
  `color: t === '$' ? '#60a5fa' : '#c9d1d9',`,
  `color: t === '$' ? 'var(--blue-400)' : 'var(--text-primary)',`
);
code = code.replace(
  `borderRight: (i === terminals.length - 1) ? '2px solid #4b5563' : undefined`,
  `borderRight: (i === terminals.length - 1) ? '2px solid var(--border-default)' : undefined`
);

// nonterminals map goto
code = code.replace(
  `color: '#f97316'`,
  `color: 'var(--orange-500, #f97316)'`
);

// isActive logic
code = code.replace(
  `color: isActive ? '#60a5fa' : '#8b949e',`,
  `color: isActive ? 'var(--blue-500)' : 'var(--text-muted)',`
);
code = code.replace(
  `borderRight: '2px solid #4b5563'`,
  `borderRight: '2px solid var(--border-default)'`
);

// isConflict in LR
code = code.replace(
  `color: isConflict ? '#f87171' : color,`,
  `color: isConflict ? 'var(--danger)' : color,`
);

// hasGoto
code = code.replace(
  `color: hasGoto ? '#f97316' : '#3a3f47',`,
  `color: hasGoto ? 'var(--orange-500, #f97316)' : 'transparent',`
);

fs.writeFileSync('src/components/workspaces/parser/ParseTablePanel.tsx', code);
