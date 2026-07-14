const fs = require('fs');
let code = fs.readFileSync('src/components/workspaces/parser/StackViewerPanel.tsx', 'utf8');

const newRenderCode = `
  // Group stack into pairs [Symbol, State] reading from bottom to top
  // stack[0] is always state 0
  // stack[1] is symbol, stack[2] is state...
  const pairs = [];
  if (stack.length > 0) {
    pairs.push({ symbol: null, state: stack[0] });
    for (let i = 1; i < stack.length; i += 2) {
      pairs.push({ symbol: stack[i], state: stack[i + 1] });
    }
  }
  
  // Display from top to bottom
  const displayPairs = pairs.reverse();

  const renderPair = (pair: any, index: number, isTop: boolean) => {
    return (
      <div
        key={\`pair_\${index}\`}
        style={{
          display: 'flex',
          height: '28px',
          background: isTop ? 'rgba(96,165,250,0.15)' : (index % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent'),
          borderBottom: '1px solid var(--border-subtle)',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.78rem',
          color: isTop ? 'var(--blue-400)' : 'var(--text-primary)',
          fontWeight: isTop ? 700 : 400
        }}
      >
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRight: '1px dashed var(--border-subtle)',
          color: pair.symbol ? 'var(--orange-400)' : 'transparent'
        }}>
          {pair.symbol?.symbol ?? '-'}
        </div>
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: isTop ? 'var(--blue-400)' : 'var(--blue-300)'
        }}>
          {pair.state !== undefined ? pair.state : '?'}
        </div>
      </div>
    );
  };
`;

code = code.replace(/\/\/ Stack entries displayed top-to-bottom[\s\S]*?return \(/, newRenderCode + '\n  return (');

// Update render in the return block
code = code.replace(/displayStack\.map\(\(item, i\) =>\s*renderItem\(item, i, i === 0\)\s*\)/, `displayPairs.map((pair, i) =>
            renderPair(pair, i, i === 0)
          )`);

fs.writeFileSync('src/components/workspaces/parser/StackViewerPanel.tsx', code);
