// src/engines/parser/lr1_types.ts

import { LR0Item } from './lr0';

export interface LR1Item extends LR0Item {
  lookaheads: Set<string>;
}

export interface LR1ItemSet {
  id: number;
  items: LR1Item[];
}
