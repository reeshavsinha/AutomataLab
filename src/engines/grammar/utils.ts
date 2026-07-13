import { CFG } from './types';

export function generateUniqueNonterminal(cfg: CFG, baseName: string, preferredSuffix: string = "'"): string {
  let candidate = baseName + preferredSuffix;
  while (cfg.nonterminals.has(candidate)) {
    if (preferredSuffix === "'") {
      candidate += "'";
    } else {
      const match = candidate.match(/(\d+)$/);
      if (match) {
        candidate = candidate.slice(0, -match[0].length) + (parseInt(match[1], 10) + 1);
      } else {
        candidate += "1";
      }
    }
  }
  return candidate;
}
