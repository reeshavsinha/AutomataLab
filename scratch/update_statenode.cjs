const fs = require('fs');
let code = fs.readFileSync('src/components/canvas/StateNode.tsx', 'utf8');

const target1 = "const startEdit = useCallback(() => {";
const replacement1 = `const toggleAccept = useCallback(() => {
    updateState(id, { isAccept: !nodeData.isAccept });
  }, [id, nodeData.isAccept, updateState]);

  const startEdit = useCallback(() => {`;
code = code.replace(target1, replacement1);

const target2 = "onDoubleClick={startEdit}";
const replacement2 = "onDoubleClick={toggleAccept}";
code = code.replace(target2, replacement2);

fs.writeFileSync('src/components/canvas/StateNode.tsx', code);
