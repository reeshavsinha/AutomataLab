import { describe, expect, it } from 'vitest';
import { mergeLayoutConfig } from './types';

describe('mergeLayoutConfig', () => {
  it('keeps default spacing when an override is present but undefined', () => {
    const config = mergeLayoutConfig({
      showExtended: false,
      horizontalSpacing: undefined,
      verticalSpacing: undefined,
    });
    expect(config.horizontalSpacing).toBe(210);
    expect(config.verticalSpacing).toBe(110);
    expect(config.showExtended).toBe(false);
  });

  it('applies numeric compact spacing', () => {
    const config = mergeLayoutConfig({ horizontalSpacing: 140, verticalSpacing: 72 });
    expect(config.horizontalSpacing).toBe(140);
    expect(config.verticalSpacing).toBe(72);
  });
});
