import { CFG } from '../grammar/types';
import { analyzeGrammar } from '../grammar/analysis';
import { generateLL1Table } from './ll1';
import { generateLR0Table } from './lr0';
import { generateSLR1Table } from './slr1';
import { generateCLR1Table } from './clr1';
import { generateLALR1Table } from './lalr1';
import { ParserModel, ParserBuildResult } from './model';

export class ParserBuilder {
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
    const warnings: string[] = [];

    try {
      model.parsers.ll1.table = generateLL1Table(cfg, analysis);
      model.parsers.ll1.hasConflict = model.parsers.ll1.table.hasConflict;
    } catch (e) {
      console.warn("Failed to generate LL1", e);
      warnings.push(`LL(1): ${e instanceof Error ? e.message : String(e)}`);
    }

    try {
      model.parsers.lr0.table = generateLR0Table(cfg);
      model.parsers.lr0.hasConflict = model.parsers.lr0.table.hasConflict;
    } catch (e) {
      console.warn("Failed to generate LR0", e);
      warnings.push(`LR(0): ${e instanceof Error ? e.message : String(e)}`);
    }

    try {
      model.parsers.slr.table = generateSLR1Table(cfg, analysis);
      model.parsers.slr.hasConflict = model.parsers.slr.table.hasConflict;
    } catch (e) {
      console.warn("Failed to generate SLR1", e);
      warnings.push(`SLR(1): ${e instanceof Error ? e.message : String(e)}`);
    }

    try {
      model.parsers.clr.table = generateCLR1Table(cfg, analysis);
      model.parsers.clr.hasConflict = model.parsers.clr.table.hasConflict;
    } catch (e) {
      console.warn("Failed to generate CLR1", e);
      warnings.push(`CLR(1): ${e instanceof Error ? e.message : String(e)}`);
    }

    try {
      model.parsers.lalr.table = generateLALR1Table(cfg, analysis);
      model.parsers.lalr.hasConflict = model.parsers.lalr.table.hasConflict;
    } catch (e) {
      console.warn("Failed to generate LALR1", e);
      warnings.push(`LALR(1): ${e instanceof Error ? e.message : String(e)}`);
    }

    return { model, diagnostics: warnings.length > 0 ? warnings.join('\n') : undefined };
  }
}
