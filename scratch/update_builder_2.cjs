const fs = require('fs');

let builderCode = fs.readFileSync('src/engines/parser/builder.ts', 'utf8');

builderCode = builderCode.replace(/import \{ ParserModel \} from '\.\/model';/, "import { ParserModel, ParserBuildResult } from './model';");

const newBuild = `export class ParserBuilder {
  static build(cfg: CFG): ParserBuildResult {
    let analysis;
    try {
      analysis = analyzeGrammar(cfg);
    } catch (e: any) {
      return { diagnostics: e.message };
    }

    const model: ParserModel = {
      cfg,
      analysis,
      parsers: {
        ll1: { table: null, hasConflict: false },
        lr0: { table: null, hasConflict: false },
        slr: { table: null, hasConflict: false },
        clr: { table: null, hasConflict: false },
        lalr: { table: null, hasConflict: false },
      }
    };

    try {`;

builderCode = builderCode.replace(/export class ParserBuilder \{\s*static build\(cfg: CFG\): ParserModel \{\s*let analysis = null;\s*let errorMsg = undefined;\s*try \{\s*analysis = analyzeGrammar\(cfg\);\s*\} catch \(e: any\) \{\s*errorMsg = e\.message;\s*\}\s*const model: ParserModel = \{\s*cfg,\s*analysis,\s*error: errorMsg,\s*parsers: \{\s*ll1: \{ table: null, hasConflict: false \},\s*lr0: \{ table: null, hasConflict: false \},\s*slr: \{ table: null, hasConflict: false \},\s*clr: \{ table: null, hasConflict: false \},\s*lalr: \{ table: null, hasConflict: false \},\s*\}\s*\};\s*if \(\!analysis\) \{\s*\/\/ Phase 2 Validation: Safely return a model with no tables if analysis fails\s*return model;\s*\}\s*try \{/, newBuild);

// Wait, the end of build needs to return { model } instead of model.
builderCode = builderCode.replace(/    return model;\n  }\n}/g, '    return { model };\n  }\n}');

fs.writeFileSync('src/engines/parser/builder.ts', builderCode);
