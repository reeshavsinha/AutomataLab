import { ParserModel, ParserEngine, ParserStatus } from './model';

export class ParsingSession {
  public readonly model: ParserModel;
  public readonly algorithm: string;
  public readonly engine: ParserEngine | null;
  public readonly input: string;

  constructor(model: ParserModel, algorithm: string, engine: ParserEngine | null, input: string) {
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
          throw new Error(`Invalid parser execution: input contains unknown token '${t}'`);
        }
      }
    }
  }

  get status(): ParserStatus {
    return this.engine ? this.engine.status : 'idle';
  }

  get stack(): any[] {
    return this.engine ? this.engine.stack : [];
  }

  get tree(): any {
    return this.engine ? this.engine.tree : null;
  }

  get derivationSteps(): string[][] {
    return this.engine ? this.engine.derivationSteps : [];
  }

  get errorMsg(): string | null {
    return this.engine ? this.engine.errorMsg : null;
  }

  get inputIndex(): number {
    return this.engine ? this.engine.inputIndex : 0;
  }
}
