import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import EmbeddableWidgetGenerator from './EmbeddableWidgetGenerator';

const base = { cityName: 'Delhi', lat: 28.6139, lon: 77.209, currentAqi: 113 };

/** The generated snippet as rendered in the code box. */
function snippet() {
  return screen.getByText(/pollution-hub-widget/).textContent;
}

describe('EmbeddableWidgetGenerator - the snippet matches the controls (#670)', () => {
  it('includes the pollutant toggle in the generated markup', () => {
    render(<EmbeddableWidgetGenerator {...base} />);
    expect(snippet()).toContain('data-pollutants="true"');

    fireEvent.click(screen.getByLabelText(/Show Pollutant Breakdown/i));
    expect(snippet()).toContain('data-pollutants="false"');
  });

  it('regenerates when the theme changes', () => {
    render(<EmbeddableWidgetGenerator {...base} />);
    expect(snippet()).toContain('data-theme="dark"');

    fireEvent.change(screen.getByDisplayValue(/Dark Mode/), { target: { value: 'light' } });
    expect(snippet()).toContain('data-theme="light"');
  });

  it('regenerates when the size changes', () => {
    render(<EmbeddableWidgetGenerator {...base} />);
    expect(snippet()).toContain('data-size="medium"');

    fireEvent.change(screen.getByDisplayValue(/Standard/), { target: { value: 'large' } });
    expect(snippet()).toContain('data-size="large"');
  });

  it('escapes a city name that would otherwise break out of the attribute', () => {
    render(<EmbeddableWidgetGenerator {...base} cityName={'Nowhere" data-evil="1'} />);
    expect(snippet()).toContain('&quot;');
    expect(snippet()).not.toContain('data-evil="1"');
  });
});

describe('EmbeddableWidgetGenerator - preview readings (#670)', () => {
  it('shows the pollutant readings it was given', () => {
    render(<EmbeddableWidgetGenerator {...base} pm25={62} no2={41} />);

    expect(screen.getByTestId('widget-preview-pm25')).toHaveTextContent('62 µg/m³');
    expect(screen.getByTestId('widget-preview-no2')).toHaveTextContent('41 µg/m³');
  });

  it('shows a dash rather than a made-up figure when no reading was passed', () => {
    render(<EmbeddableWidgetGenerator {...base} />);

    expect(screen.getByTestId('widget-preview-pm25')).toHaveTextContent('—');
    expect(screen.getByTestId('widget-preview-no2')).toHaveTextContent('—');
  });

  it('never shows the old hardcoded 35 / 28 for a different city', () => {
    render(<EmbeddableWidgetGenerator {...base} cityName="Mumbai" pm25={9} no2={12} />);

    const preview = screen.getByTestId('embeddable-widget-page');
    expect(preview).not.toHaveTextContent('35 µg/m³');
    expect(preview).not.toHaveTextContent('28 µg/m³');
  });

  it('shows a dash rather than a stand-in AQI when there is no reading', () => {
    render(<EmbeddableWidgetGenerator cityName="Delhi" />);

    expect(screen.getByTestId('widget-preview-aqi')).toHaveTextContent('—');
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('hides the breakdown when the toggle is off', () => {
    render(<EmbeddableWidgetGenerator {...base} pm25={62} no2={41} />);
    fireEvent.click(screen.getByLabelText(/Show Pollutant Breakdown/i));

    expect(screen.queryByTestId('widget-preview-pm25')).not.toBeInTheDocument();
  });
});

describe('EmbeddableWidgetGenerator - AQI banding (#670)', () => {
  it.each([
    [25, 'Good'],
    [75, 'Moderate'],
    [125, 'Unhealthy (Sensitive)'],
    [175, 'Unhealthy'],
    [250, 'Very Unhealthy'],
    [450, 'Hazardous'],
  ])('labels AQI %i as %s', (aqi, label) => {
    render(<EmbeddableWidgetGenerator {...base} currentAqi={aqi} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('distinguishes a hazardous reading from a merely unhealthy one', () => {
    // The local scale stopped at 150, so 450 and 175 rendered identically.
    const { unmount } = render(<EmbeddableWidgetGenerator {...base} currentAqi={175} />);
    const unhealthy = screen.getByTestId('widget-preview-aqi').style.color;
    unmount();

    render(<EmbeddableWidgetGenerator {...base} currentAqi={450} />);
    expect(screen.getByTestId('widget-preview-aqi').style.color).not.toBe(unhealthy);
  });
});

describe('EmbeddableWidgetGenerator - copy button (#670)', () => {
  const originalClipboard = navigator.clipboard;

  const setClipboard = (value) => {
    Object.defineProperty(navigator, 'clipboard', {
      value,
      configurable: true,
      writable: true,
    });
  };

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    // jsdom does not implement execCommand, so there is nothing to spy on until
    // it exists. Defined per-test and removed again in afterEach.
    if (!document.execCommand) {
      document.execCommand = () => false;
    }
  });

  afterEach(() => {
    vi.useRealTimers();
    setClipboard(originalClipboard);
    vi.restoreAllMocks();
    delete document.execCommand;
  });

  it('reports success when the clipboard write resolves', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });

    render(<EmbeddableWidgetGenerator {...base} />);
    fireEvent.click(screen.getByTestId('widget-copy-button'));

    await waitFor(() =>
      expect(screen.getByTestId('widget-copy-button')).toHaveTextContent('Copied Code!')
    );
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('data-pollutants'));
  });

  it('reports failure instead of claiming success when the write rejects', async () => {
    setClipboard({ writeText: vi.fn().mockRejectedValue(new Error('denied')) });
    vi.spyOn(document, 'execCommand').mockReturnValue(false);

    render(<EmbeddableWidgetGenerator {...base} />);
    fireEvent.click(screen.getByTestId('widget-copy-button'));

    await waitFor(() =>
      expect(screen.getByTestId('widget-copy-button')).toHaveTextContent(/Copy failed/)
    );
  });

  it('falls back to execCommand on an origin with no clipboard API', async () => {
    setClipboard(undefined);
    const execCommand = vi.spyOn(document, 'execCommand').mockReturnValue(true);

    render(<EmbeddableWidgetGenerator {...base} />);
    fireEvent.click(screen.getByTestId('widget-copy-button'));

    await waitFor(() =>
      expect(screen.getByTestId('widget-copy-button')).toHaveTextContent('Copied Code!')
    );
    expect(execCommand).toHaveBeenCalledWith('copy');
  });

  it('returns to the idle label after the confirmation window', async () => {
    setClipboard({ writeText: vi.fn().mockResolvedValue(undefined) });

    render(<EmbeddableWidgetGenerator {...base} />);
    fireEvent.click(screen.getByTestId('widget-copy-button'));

    await waitFor(() =>
      expect(screen.getByTestId('widget-copy-button')).toHaveTextContent('Copied Code!')
    );

    await act(() => vi.advanceTimersByTimeAsync(2600));
    expect(screen.getByTestId('widget-copy-button')).toHaveTextContent('Copy HTML');
  });
});
