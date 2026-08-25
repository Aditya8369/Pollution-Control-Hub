import { describe, it, expect } from 'vitest';
import { getNextFocusIndex, getTabStopIndex, isRovingKey } from './rovingFocus';

describe('getTabStopIndex', () => {
  it('puts the tab stop on the first item when nothing is selected', () => {
    // The regression this exists for: `tabIndex={selected === option ? 0 : -1}`
    // with `selected === ''` gave every option -1, so the group had no tab stop.
    expect(getTabStopIndex(-1, 4)).toBe(0);
  });

  it('puts the tab stop on the selected item', () => {
    expect(getTabStopIndex(2, 4)).toBe(2);
    expect(getTabStopIndex(0, 4)).toBe(0);
    expect(getTabStopIndex(3, 4)).toBe(3);
  });

  it('falls back to the first item for an index outside the group', () => {
    expect(getTabStopIndex(9, 4)).toBe(0);
    expect(getTabStopIndex(NaN, 4)).toBe(0);
  });

  it('has no tab stop for an empty group', () => {
    expect(getTabStopIndex(-1, 0)).toBe(-1);
    expect(getTabStopIndex(0, 0)).toBe(-1);
  });

  it('always yields exactly one tab stop for a populated group', () => {
    for (const active of [-1, 0, 1, 2, 3, 7]) {
      const stop = getTabStopIndex(active, 4);
      const tabbable = [0, 1, 2, 3].filter((i) => i === stop);
      expect(tabbable).toHaveLength(1);
    }
  });
});

describe('getNextFocusIndex', () => {
  it('moves forward on ArrowDown and ArrowRight', () => {
    expect(getNextFocusIndex('ArrowDown', 0, 4)).toBe(1);
    expect(getNextFocusIndex('ArrowRight', 1, 4)).toBe(2);
  });

  it('moves backward on ArrowUp and ArrowLeft', () => {
    expect(getNextFocusIndex('ArrowUp', 2, 4)).toBe(1);
    expect(getNextFocusIndex('ArrowLeft', 1, 4)).toBe(0);
  });

  it('wraps at both ends, as the radiogroup pattern specifies', () => {
    expect(getNextFocusIndex('ArrowDown', 3, 4)).toBe(0);
    expect(getNextFocusIndex('ArrowUp', 0, 4)).toBe(3);
  });

  it('jumps to the ends on Home and End', () => {
    expect(getNextFocusIndex('Home', 2, 4)).toBe(0);
    expect(getNextFocusIndex('End', 1, 4)).toBe(3);
  });

  it('returns null for a key it does not handle', () => {
    expect(getNextFocusIndex('Enter', 1, 4)).toBeNull();
    expect(getNextFocusIndex(' ', 1, 4)).toBeNull();
    expect(getNextFocusIndex('a', 1, 4)).toBeNull();
    expect(getNextFocusIndex('Tab', 1, 4)).toBeNull();
  });

  it('returns null for an empty group', () => {
    expect(getNextFocusIndex('ArrowDown', 0, 0)).toBeNull();
  });

  it('treats an out-of-range current index as the first item', () => {
    expect(getNextFocusIndex('ArrowDown', -1, 4)).toBe(1);
    expect(getNextFocusIndex('ArrowUp', 99, 4)).toBe(3);
  });

  it('stays put in a single-item group', () => {
    expect(getNextFocusIndex('ArrowDown', 0, 1)).toBe(0);
    expect(getNextFocusIndex('ArrowUp', 0, 1)).toBe(0);
  });
});

describe('isRovingKey', () => {
  it('claims the keys the pattern owns', () => {
    for (const key of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End']) {
      expect(isRovingKey(key)).toBe(true);
    }
  });

  it('leaves everything else to the browser', () => {
    // Enter and Space must reach the button; Tab must leave the group.
    for (const key of ['Enter', ' ', 'Tab', 'Escape', 'a']) {
      expect(isRovingKey(key)).toBe(false);
    }
  });
});
