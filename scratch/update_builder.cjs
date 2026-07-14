const fs = require('fs');

// Modify model.ts
let modelCode = fs.readFileSync('src/engines/parser/model.ts', 'utf8');
modelCode = modelCode.replace(/analysis: GrammarAnalysisResult;/, 'analysis: GrammarAnalysisResult | null;\n  error?: string;');
fs.writeFileSync('src/engines/parser/model.ts', modelCode);

// Modify builder.ts
let builderCode = fs.readFileSync('src/engines/parser/builder.ts', 'utf8');
const replacement = `export class ParserBuilder {
  static build(cfg: CFG): ParserModel {
    let analysis = null;
    let errorMsg = undefined;
    try {
      analysis = analyzeGrammar(cfg);
    } catch (e) {
      errorMsg = e.message;
    }

    const model: ParserModel = {
      cfg,
      analysis,
      error: errorMsg,
      parsers: {
        ll1: { table: null, hasConflict: false },
        lr0: { table: null, hasConflict: false },
        slr: { table: null, hasConflict: false },
        clr: { table: null, hasConflict: false },
        lalr: { table: null, hasConflict: false },
      }
    };

    if (!analysis) {
      // Phase 2 Validation: Safely return a model with no tables if analysis fails
      return model;
    }

    try {`;
builderCode = builderCode.replace(/export class ParserBuilder \{\s*static build\(cfg: CFG\): ParserModel \{\s*const analysis = analyzeGrammar\(cfg\);\s*const model: ParserModel = \{\s*cfg,\s*analysis,\s*parsers: \{\s*ll1: \{ table: null, hasConflict: false \},\s*lr0: \{ table: null, hasConflict: false \},\s*slr: \{ table: null, hasConflict: false \},\s*clr: \{ table: null, hasConflict: false \},\s*lalr: \{ table: null, hasConflict: false \},\s*\}\s*\};\s*try \{/, replacement);

fs.writeFileSync('src/engines/parser/builder.ts', builderCode);
