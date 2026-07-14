const fs = require('fs');
let code = fs.readFileSync('src/store/machineStore.ts', 'utf8');

const replacement = `    addTransition: (from, to, symbols) => {
      // Phase 2 Validation
      const { machine } = get();
      if (!machine.states.find(s => s.id === from) || !machine.states.find(s => s.id === to)) {
        throw new Error('Invalid runtime state: transition references a nonexistent state');
      }

      const newTransition: Transition = {
        id: generateId('trans'),
        from,
        to,
        symbols,
      }
      set((s) => sync(s, { transitions: [...s.machine.transitions, newTransition] }))
      return newTransition
    },`;

code = code.replace(/    addTransition: \(from, to, symbols\) => \{\s*const newTransition: Transition = \{\s*id: generateId\('trans'\),\s*from,\s*to,\s*symbols,\s*\}\s*set\(\(s\) => sync\(s, \{ transitions: \[\.\.\.s\.machine\.transitions, newTransition\] \}\)\)\s*return newTransition\s*\},/, replacement);

fs.writeFileSync('src/store/machineStore.ts', code);
