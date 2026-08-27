import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { renderBoldMarkup } from './boldMarkup';

/**
 * Cover for #1053.
 *
 * The assertions that matter are the ones about what does *not* happen: no
 * element is created from the text, and the angle brackets survive as
 * characters. A test that only checks the bold segments would have passed
 * against the `innerHTML` version too.
 */

/** @param {unknown} text */
function renderText(text) {
  return render(<div data-testid="out">{renderBoldMarkup(text)}</div>);
}

describe('renderBoldMarkup — bold segments', () => {
  it('wraps a **span** in <strong>', () => {
    renderText('the highest was **January 2026** overall');

    const strong = screen.getByText('January 2026');
    expect(strong.tagName).toBe('STRONG');
    expect(screen.getByTestId('out')).toHaveTextContent(
      'the highest was January 2026 overall'
    );
  });

  it('handles several spans in one string', () => {
    renderText('**January** was worst, **June** was cleanest');

    expect(screen.getByText('January').tagName).toBe('STRONG');
    expect(screen.getByText('June').tagName).toBe('STRONG');
  });

  it('keeps the text between and around the spans', () => {
    renderText('a **b** c **d** e');
    expect(screen.getByTestId('out')).toHaveTextContent('a b c d e');
  });

  it('leaves an unclosed marker as literal text', () => {
    // Guessing here would bold the entire rest of the string.
    renderText('rated 5 ** out of 10');

    expect(screen.getByTestId('out')).toHaveTextContent('rated 5 ** out of 10');
    expect(screen.getByTestId('out').querySelector('strong')).toBeNull();
  });

  it('does not carry regex state between calls', () => {
    // A shared global regex keeps `lastIndex` between calls, so the second
    // string would start matching from wherever the first one stopped.
    const first = renderBoldMarkup('**one**');
    const second = renderBoldMarkup('**two**');
    expect(first).toHaveLength(1);
    expect(second).toHaveLength(1);
  });
});

describe('renderBoldMarkup — escaping (#1053)', () => {
  it('renders a script tag as text, not as an element', () => {
    const hostile = 'Based on the past year in <script>alert(1)</script>, ...';
    renderText(hostile);

    const out = screen.getByTestId('out');
    expect(out.querySelector('script')).toBeNull();
    expect(out).toHaveTextContent('<script>alert(1)</script>');
  });

  it('renders an img onerror payload as text, not as an element', () => {
    // The realistic shape: a place name from the geocoder.
    renderText('Readings for <img src=x onerror="alert(1)"> this month');

    const out = screen.getByTestId('out');
    expect(out.querySelector('img')).toBeNull();
    // The angle brackets are entities, so there is no tag for the parser to
    // build and no attribute for it to bind. `onerror` still appears in the
    // markup -- as the escaped text it always was.
    expect(out.innerHTML).toContain('&lt;img');
    expect(out.innerHTML).not.toContain('<img');
    expect(out).toHaveTextContent('<img src=x onerror="alert(1)">');
  });

  it('escapes markup inside a bold span too', () => {
    renderText('**<b>Delhi</b>**');

    const out = screen.getByTestId('out');
    expect(out.querySelector('b')).toBeNull();
    expect(screen.getByText('<b>Delhi</b>').tagName).toBe('STRONG');
  });

  it('leaves ampersands and quotes as single characters', () => {
    // #497 was the mirror of this: text that had been escaped twice and
    // rendered as "Smoke &amp;amp; dust".
    renderText('Smoke & dust in "Anand Vihar"');
    expect(screen.getByTestId('out')).toHaveTextContent('Smoke & dust in "Anand Vihar"');
  });
});

describe('renderBoldMarkup — non-strings', () => {
  it('returns nothing rather than throwing', () => {
    // The old code called `.replace` straight on the value, so an insight
    // without a description took the whole panel down.
    for (const value of [undefined, null, 42, {}, [], true]) {
      expect(() => renderBoldMarkup(value)).not.toThrow();
      expect(renderBoldMarkup(value)).toEqual([]);
    }
  });

  it('returns nothing for an empty string', () => {
    expect(renderBoldMarkup('')).toEqual([]);
  });
});
