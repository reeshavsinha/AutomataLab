const fs = require('fs');
let code = fs.readFileSync('src/engines/parser/session.ts', 'utf8');

const replacement = `  constructor(model: ParserModel, algorithm: string, engine: ParserEngine | null, input: string) {
    this.model = model;
    this.algorithm = algorithm;
    this.engine = engine;
    this.input = input;

    // Phase 2 Validation
    if (!engine) {
      throw new Error('Invalid parser execution: missing or unsupported parser engine');
    }
    const tokens = engine.input;
    if (tokens) {
      for (const t of tokens) {
        if (t !== '$' && t !== '' && !model.cfg.terminals.has(t)) {
          throw new Error("Invalid parser execution: input contains unknown token '" + t + "'");
        }
      }
    }
  }`;

code = code.replace(/  constructor\(model: ParserModel, algorithm: string, engine: ParserEngine \| null, input: string\) \{\s*this\.model = model;\s*this\.algorithm = algorithm;\s*this\.engine = engine;\s*this\.input = input;\s*\}/, replacement);
fs.writeFileSync('src/engines/parser/session.ts', code);
