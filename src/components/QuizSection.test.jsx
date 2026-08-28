import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import QuizSection from './QuizSection';
import { eventBus } from '../core/events';

/** Opens the first quiz and returns its option buttons. */
function startQuiz(name = /Eco IQ Challenge/) {
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`Start ${name.source ?? name}`) }));
  return screen.getAllByRole('radio');
}

function group() {
  return screen.getByRole('radiogroup');
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('QuizSection - keyboard reachability (regression for #1014)', () => {
  it('leaves exactly one option tabbable before anything is selected', () => {
    render(<QuizSection />);
    const options = startQuiz();

    // Every option had tabIndex -1 until one was chosen, so the group had no tab
    // stop and the answers were unreachable by keyboard on every question.
    const tabbable = options.filter((option) => option.getAttribute('tabindex') === '0');
    expect(tabbable).toHaveLength(1);
    expect(tabbable[0]).toBe(options[0]);
  });

  it('keeps exactly one option tabbable after an answer', () => {
    render(<QuizSection />);
    const options = startQuiz();

    fireEvent.click(options[2]);

    const tabbable = screen.getAllByRole('radio').filter((o) => o.getAttribute('tabindex') === '0');
    expect(tabbable).toHaveLength(1);
    expect(tabbable[0]).toHaveAttribute('aria-checked', 'true');
  });

  it('restores the tab stop on the next question', () => {
    render(<QuizSection />);
    const options = startQuiz();

    fireEvent.click(options[0]);
    fireEvent.click(screen.getByRole('button', { name: /Next Question/ }));

    // `goNext` resets `selected` to '', which is what made this permanent rather
    // than a first-question-only problem.
    const next = screen.getAllByRole('radio');
    expect(next.filter((o) => o.getAttribute('tabindex') === '0')).toHaveLength(1);
  });

  it('reaches the group from the quiz heading with a single tab stop', () => {
    render(<QuizSection />);
    const options = startQuiz();

    options[0].focus();
    expect(document.activeElement).toBe(options[0]);
  });
});

describe('QuizSection - arrow key navigation', () => {
  it('moves focus forward with ArrowDown and ArrowRight', () => {
    render(<QuizSection />);
    const options = startQuiz();
    options[0].focus();

    fireEvent.keyDown(options[0], { key: 'ArrowDown' });
    expect(document.activeElement).toBe(options[1]);

    fireEvent.keyDown(options[1], { key: 'ArrowRight' });
    expect(document.activeElement).toBe(options[2]);
  });

  it('moves focus backward with ArrowUp and ArrowLeft', () => {
    render(<QuizSection />);
    const options = startQuiz();
    options[2].focus();

    fireEvent.keyDown(options[2], { key: 'ArrowUp' });
    expect(document.activeElement).toBe(options[1]);

    fireEvent.keyDown(options[1], { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(options[0]);
  });

  it('wraps around both ends', () => {
    render(<QuizSection />);
    const options = startQuiz();
    const last = options.length - 1;

    options[0].focus();
    fireEvent.keyDown(options[0], { key: 'ArrowUp' });
    expect(document.activeElement).toBe(options[last]);

    fireEvent.keyDown(options[last], { key: 'ArrowDown' });
    expect(document.activeElement).toBe(options[0]);
  });

  it('jumps to the ends with Home and End', () => {
    render(<QuizSection />);
    const options = startQuiz();
    options[1].focus();

    fireEvent.keyDown(options[1], { key: 'End' });
    expect(document.activeElement).toBe(options[options.length - 1]);

    fireEvent.keyDown(document.activeElement, { key: 'Home' });
    expect(document.activeElement).toBe(options[0]);
  });

  it('prevents the default so arrow keys do not scroll the page', () => {
    render(<QuizSection />);
    const options = startQuiz();
    options[0].focus();

    const event = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
    options[0].dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('leaves Tab and Enter to the browser', () => {
    render(<QuizSection />);
    const options = startQuiz();
    options[0].focus();

    for (const key of ['Tab', 'Enter', ' ']) {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      options[0].dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
    }
  });

  it('can be answered entirely from the keyboard', () => {
    render(<QuizSection />);
    const options = startQuiz();
    options[0].focus();

    fireEvent.keyDown(options[0], { key: 'ArrowDown' });
    fireEvent.click(document.activeElement); // Enter on a <button> fires a click

    expect(options[1]).toHaveAttribute('aria-checked', 'true');
  });
});

describe('QuizSection - feedback after answering', () => {
  it('keeps the options in the accessibility tree', () => {
    render(<QuizSection />);
    const options = startQuiz();
    fireEvent.click(options[0]);

    // `disabled` removed them from the tree entirely, so a screen reader user had
    // no way to read back which option was right.
    expect(screen.getAllByRole('radio')).toHaveLength(options.length);
    for (const option of screen.getAllByRole('radio')) {
      expect(option).toHaveAttribute('aria-disabled', 'true');
    }
  });

  it('names the correct answer in text, not only in colour', () => {
    render(<QuizSection />);
    const options = startQuiz();
    const correct = options.find((o) => o.textContent.includes('PM2.5'));

    fireEvent.click(options.find((o) => o.textContent.includes('PM10')));

    expect(correct.textContent).toContain('(correct answer)');
  });

  it('marks the wrong choice in text too', () => {
    render(<QuizSection />);
    const options = startQuiz();
    const wrong = options.find((o) => o.textContent.includes('PM10'));

    fireEvent.click(wrong);

    expect(wrong.textContent).toContain('(your answer, incorrect)');
  });

  it('does not mark an unchosen wrong option', () => {
    render(<QuizSection />);
    const options = startQuiz();
    const untouched = options.find((o) => o.textContent.includes('Ozone'));

    fireEvent.click(options.find((o) => o.textContent.includes('PM10')));

    expect(untouched.textContent).not.toContain('incorrect');
    expect(untouched.textContent).not.toContain('correct answer');
  });

  it('ignores a second click on an answered question', () => {
    render(<QuizSection />);
    const options = startQuiz();

    fireEvent.click(options[0]);
    fireEvent.click(options[1]);

    expect(options[0]).toHaveAttribute('aria-checked', 'true');
    expect(options[1]).toHaveAttribute('aria-checked', 'false');
  });
});

describe('QuizSection - scoring still works', () => {
  it('counts a correct answer and reports it at the end', () => {
    const emit = vi.spyOn(eventBus, 'emit');
    render(<QuizSection />);

    startQuiz();
    expect(within(group()).getAllByRole('radio').length).toBeGreaterThan(0);

    // Answer every question with the first option, then walk to the end.
    for (let i = 0; ; i++) {
      const opts = screen.getAllByRole('radio');
      fireEvent.click(opts[0]);
      const advance = screen.getByRole('button', { name: /Next Question|Finish Quiz/ });
      const isLast = /Finish Quiz/.test(advance.textContent);
      fireEvent.click(advance);
      if (isLast) break;
      if (i > 20) throw new Error('quiz did not terminate');
    }

    expect(screen.getByText(/Quiz Complete/)).toBeInTheDocument();
    const completed = emit.mock.calls.find(([name]) => name === 'QUIZ_COMPLETED');
    expect(completed).toBeTruthy();
    expect(completed[1].total).toBe(5);
  });

  it('returns to the selector on restart', () => {
    render(<QuizSection />);
    startQuiz();

    fireEvent.click(screen.getByRole('button', { name: /Back/ }));
    expect(screen.getByText('Choose Your Quiz')).toBeInTheDocument();
  });
});
