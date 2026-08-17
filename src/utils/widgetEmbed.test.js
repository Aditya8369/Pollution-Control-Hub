import { describe, it, expect } from 'vitest';
import {
  buildEmbedSnippet,
  widgetAttributes,
  escapeHtmlAttribute,
  WIDGET_CLASS,
  WIDGET_SCRIPT_URL,
} from './widgetEmbed';

/** The attributes as a lookup, for assertions that don't care about order. */
function attrs(config) {
  return Object.fromEntries(widgetAttributes(config));
}

describe('escapeHtmlAttribute', () => {
  it('escapes the double quote that closes the attribute early', () => {
    expect(escapeHtmlAttribute('Say "hi"')).toBe('Say &quot;hi&quot;');
  });

  it('escapes angle brackets, ampersands and apostrophes', () => {
    expect(escapeHtmlAttribute("<b>&'")).toBe('&lt;b&gt;&amp;&#39;');
  });

  it('escapes the ampersand first, so entities are not double-escaped', () => {
    expect(escapeHtmlAttribute('"')).toBe('&quot;');
    expect(escapeHtmlAttribute('&quot;')).toBe('&amp;quot;');
  });

  it('leaves ordinary text alone, including non-ASCII names', () => {
    expect(escapeHtmlAttribute('Ürümqi')).toBe('Ürümqi');
    expect(escapeHtmlAttribute('São Paulo')).toBe('São Paulo');
  });

  it('returns an empty string for null and undefined', () => {
    expect(escapeHtmlAttribute(null)).toBe('');
    expect(escapeHtmlAttribute(undefined)).toBe('');
  });
});

describe('widgetAttributes', () => {
  it('carries the pollutant toggle, which the old snippet dropped entirely', () => {
    expect(attrs({ showPollutants: true })['data-pollutants']).toBe('true');
    expect(attrs({ showPollutants: false })['data-pollutants']).toBe('false');
  });

  it('carries city, coordinates, theme and size', () => {
    expect(
      attrs({ cityName: 'Delhi', lat: 28.6139, lon: 77.209, theme: 'light', size: 'large' })
    ).toMatchObject({
      'data-city': 'Delhi',
      'data-lat': '28.6139',
      'data-lon': '77.209',
      'data-theme': 'light',
      'data-size': 'large',
    });
  });

  it('falls back to the first allowed value for an unknown theme or size', () => {
    const result = attrs({ theme: 'neon', size: 'enormous' });
    expect(result['data-theme']).toBe('dark');
    expect(result['data-size']).toBe('medium');
  });

  it('omits coordinates that are not finite numbers', () => {
    const result = attrs({ lat: undefined, lon: NaN });
    expect(result).not.toHaveProperty('data-lat');
    expect(result).not.toHaveProperty('data-lon');
  });

  it('accepts numeric coordinates given as strings', () => {
    expect(attrs({ lat: '28.6139', lon: '77.209' })).toMatchObject({
      'data-lat': '28.6139',
      'data-lon': '77.209',
    });
  });
});

describe('buildEmbedSnippet', () => {
  const base = {
    cityName: 'Delhi',
    lat: 28.6139,
    lon: 77.209,
    theme: 'dark',
    size: 'medium',
    showPollutants: true,
  };

  it('emits a container and the loader script', () => {
    const snippet = buildEmbedSnippet(base);
    expect(snippet).toContain(`class="${WIDGET_CLASS}"`);
    expect(snippet).toContain(`<script src="${WIDGET_SCRIPT_URL}" async></script>`);
  });

  it('reflects the pollutant toggle in the copied markup', () => {
    expect(buildEmbedSnippet({ ...base, showPollutants: false })).toContain(
      'data-pollutants="false"'
    );
    expect(buildEmbedSnippet({ ...base, showPollutants: true })).toContain(
      'data-pollutants="true"'
    );
  });

  it('produces different markup for every option the panel exposes', () => {
    const variants = [
      buildEmbedSnippet(base),
      buildEmbedSnippet({ ...base, theme: 'light' }),
      buildEmbedSnippet({ ...base, size: 'small' }),
      buildEmbedSnippet({ ...base, size: 'large' }),
      buildEmbedSnippet({ ...base, showPollutants: false }),
    ];
    expect(new Set(variants).size).toBe(variants.length);
  });

  it('uses no id, so two widgets can sit on one page', () => {
    const snippet = buildEmbedSnippet(base);
    expect(snippet).not.toContain('id=');

    // Two containers concatenated must not repeat any id.
    const page = `${snippet}\n${buildEmbedSnippet({ ...base, cityName: 'Mumbai' })}`;
    expect(page.match(/\sid="/g)).toBeNull();
  });

  it('escapes a city name containing a double quote', () => {
    const snippet = buildEmbedSnippet({ ...base, cityName: 'Nowhere" data-evil="1' });

    expect(snippet).not.toContain('data-evil="1"');
    expect(snippet).toContain('data-city="Nowhere&quot; data-evil=&quot;1"');
  });

  it('leaves the container as a single well-formed element under a hostile name', () => {
    const snippet = buildEmbedSnippet({
      ...base,
      cityName: '"><script>alert(1)</script>',
    });

    // One opening div, one script tag — the loader's, not an injected one.
    expect(snippet.match(/<div/g)).toHaveLength(1);
    expect(snippet.match(/<script/g)).toHaveLength(1);
    expect(snippet).toContain(WIDGET_SCRIPT_URL);
  });

  it('parses back into a single element carrying the intended configuration', () => {
    const host = document.createElement('div');
    host.innerHTML = buildEmbedSnippet({
      ...base,
      cityName: 'Nowhere" data-evil="1',
      showPollutants: false,
    });

    const container = host.querySelector(`.${WIDGET_CLASS}`);
    expect(container).not.toBeNull();
    expect(container.getAttribute('data-city')).toBe('Nowhere" data-evil="1');
    expect(container.getAttribute('data-evil')).toBeNull();
    expect(container.getAttribute('data-pollutants')).toBe('false');
  });

  it('does not throw on an empty config', () => {
    expect(() => buildEmbedSnippet()).not.toThrow();
    expect(buildEmbedSnippet()).toContain(`class="${WIDGET_CLASS}"`);
  });
});
