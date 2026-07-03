const fs = require('fs');
let code = fs.readFileSync('src/components/workspaces/parser/ParseTablePanel.tsx', 'utf8');

// Replace algorithm !== 'LL1' with simulation?.presentation?.automatonVisible
code = code.replace(
  /{algorithm !== 'LL1' && \(/g,
  `{simulation?.presentation?.automatonVisible && (`
);

// We should also replace the bottom part where it renders the view:
// viewMode === 'automaton' && algorithm !== 'LL1' ? <AutomatonViewerPanel /> :
code = code.replace(
  /viewMode === 'automaton' && algorithm !== 'LL1' \? <AutomatonViewerPanel \/> :/g,
  `viewMode === 'automaton' && simulation?.presentation?.automatonVisible ? <AutomatonViewerPanel /> :`
);

fs.writeFileSync('src/components/workspaces/parser/ParseTablePanel.tsx', code);
