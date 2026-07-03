const fs = require('fs');
let code = fs.readFileSync('src/store/parserStore.ts', 'utf8');

const initReplacement = `initializeSim: () => {
    const { tokens, algorithm, model } = get();
    const { cfg } = useGrammarStore.getState();
    if (!cfg || !model) return;

    let sim = null;
    if (algorithm === 'LL1') {
      if (!model.parsers.ll1.table || model.parsers.ll1.hasConflict) return;
      sim = new LL1Simulation(cfg, model.parsers.ll1.table);
    } else if (algorithm === 'LR0') {
      if (!model.parsers.lr0.table || model.parsers.lr0.hasConflict) return;
      sim = new LRSimulation(cfg, model.parsers.lr0.table);
    } else if (algorithm === 'SLR1') {
      if (!model.parsers.slr.table || model.parsers.slr.hasConflict) return;
      sim = new LRSimulation(cfg, model.parsers.slr.table);
    } else if (algorithm === 'CLR1') {
      if (!model.parsers.clr.table || model.parsers.clr.hasConflict) return;
      sim = new LRSimulation(cfg, model.parsers.clr.table);
    } else if (algorithm === 'LALR1') {
      if (!model.parsers.lalr.table || model.parsers.lalr.hasConflict) return;
      sim = new LRSimulation(cfg, model.parsers.lalr.table);
    } else if (algorithm === 'CYK') {
      sim = new CYKSimulation(cfg);
    } else if (algorithm === 'EARLEY') {
      sim = new EarleySimulation(cfg);
    } else if (algorithm === 'BACKTRACKING') {
      sim = new BacktrackingSimulation(cfg);
    } else {
      return;
    }

    if (sim) {
      sim.initialize(tokens);
      const session = new ParsingSession(model, algorithm, sim, get().rawInput);
      set({ simulation: sim, session, currentStep: 0, maxStep: 0, isPlaying: false });
    }
  },`;

const seekReplacement = `seekToStep: (targetStep) => {
    const { tokens, algorithm, model } = get();
    const { cfg } = useGrammarStore.getState();
    if (!cfg || !model) return;

    let sim = null;
    if (algorithm === 'LL1') {
      if (!model.parsers.ll1.table || model.parsers.ll1.hasConflict) return;
      sim = new LL1Simulation(cfg, model.parsers.ll1.table);
    } else if (algorithm === 'LR0') {
      if (!model.parsers.lr0.table || model.parsers.lr0.hasConflict) return;
      sim = new LRSimulation(cfg, model.parsers.lr0.table);
    } else if (algorithm === 'SLR1') {
      if (!model.parsers.slr.table || model.parsers.slr.hasConflict) return;
      sim = new LRSimulation(cfg, model.parsers.slr.table);
    } else if (algorithm === 'CLR1') {
      if (!model.parsers.clr.table || model.parsers.clr.hasConflict) return;
      sim = new LRSimulation(cfg, model.parsers.clr.table);
    } else if (algorithm === 'LALR1') {
      if (!model.parsers.lalr.table || model.parsers.lalr.hasConflict) return;
      sim = new LRSimulation(cfg, model.parsers.lalr.table);
    } else if (algorithm === 'CYK') {
      sim = new CYKSimulation(cfg);
    } else if (algorithm === 'EARLEY') {
      sim = new EarleySimulation(cfg);
    } else if (algorithm === 'BACKTRACKING') {
      sim = new BacktrackingSimulation(cfg);
    } else {
      return;
    }

    if (sim) {
      sim.initialize(tokens);
      let steps = 0;
      while (steps < targetStep) {
        if (!sim.step()) break;
        steps++;
      }
      const session = new ParsingSession(model, algorithm, sim, get().rawInput);
      set({ simulation: sim, session, currentStep: steps, maxStep: Math.max(get().maxStep, steps) });
    }
  },`;

code = code.replace(/initializeSim: \(\) => \{[\s\S]*?set\(\{ simulation: sim, currentStep: 0, maxStep: 0, isPlaying: false \}\);\n    \}\n  \},/, initReplacement);
code = code.replace(/seekToStep: \(targetStep\) => \{[\s\S]*?set\(\{ simulation: sim, currentStep: steps, maxStep: Math\.max\(get\(\)\.maxStep, steps\) \}\);\n    \}\n  \},/, seekReplacement);

code = code.replace(/simulation: LL1Simulation \| LRSimulation \| CYKSimulation \| EarleySimulation \| BacktrackingSimulation \| null;/g, 'simulation: ParserEngine | null;');

fs.writeFileSync('src/store/parserStore.ts', code);
