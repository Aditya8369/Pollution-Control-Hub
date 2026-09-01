import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { downloadFile, safeFilenamePart } from './downloadFile';

describe('safeFilenamePart', () => {
    it('keeps a value that is already safe', () => {
        expect(safeFilenamePart('2026-01-31')).toBe('2026-01-31');
        expect(safeFilenamePart('CPCB')).toBe('CPCB');
    });

    it('replaces separators that break a filename', () => {
        expect(safeFilenamePart('31/01/2026')).toBe('31-01-2026');
        expect(safeFilenamePart('WHO Global')).toBe('WHO-Global');
        expect(safeFilenamePart('../../etc/passwd')).toBe('etc-passwd');
    });

    it('trims the separators it introduced from both ends', () => {
        expect(safeFilenamePart('  spaced  ')).toBe('spaced');
        expect(safeFilenamePart('///')).toBe('report');
    });

    it('falls back for an empty or missing value', () => {
        expect(safeFilenamePart('')).toBe('report');
        expect(safeFilenamePart(null)).toBe('report');
        expect(safeFilenamePart(undefined, 'standard')).toBe('standard');
    });
});

describe('downloadFile', () => {
    let createObjectURL;
    let revokeObjectURL;
    let clicked;

    beforeEach(() => {
        vi.useFakeTimers();
        clicked = [];
        createObjectURL = vi.fn(() => 'blob:mock-url');
        revokeObjectURL = vi.fn();
        vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL });

        // jsdom does not navigate, so the click is recorded rather than performed —
        // along with whether the anchor was in the document at the time.
        vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function record() {
            clicked.push({
                href: this.href,
                download: this.download,
                attached: document.body.contains(this),
            });
        });
    });

    afterEach(() => {
        vi.runOnlyPendingTimers();
        vi.useRealTimers();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('clicks an anchor carrying the blob URL and the filename', () => {
        expect(downloadFile('a,b,c', 'text/csv', 'report.csv')).toBe(true);

        expect(createObjectURL).toHaveBeenCalledTimes(1);
        expect(clicked).toHaveLength(1);
        expect(clicked[0].href).toBe('blob:mock-url');
        expect(clicked[0].download).toBe('report.csv');
    });

    it('has the anchor in the document at the moment it is clicked', () => {
        downloadFile('a,b,c', 'text/csv', 'report.csv');
        // A detached anchor's programmatic download click is ignored by some browsers.
        expect(clicked[0].attached).toBe(true);
    });

    it('leaves nothing behind in the DOM', () => {
        downloadFile('a,b,c', 'text/csv', 'report.csv');
        expect(document.querySelectorAll('a[download]')).toHaveLength(0);
    });

    it('revokes the object URL, so the blob is not pinned for the life of the tab', () => {
        downloadFile('a,b,c', 'text/csv', 'report.csv');

        // Not revoked synchronously: some browsers read the blob after the click returns.
        expect(revokeObjectURL).not.toHaveBeenCalled();

        vi.runAllTimers();
        expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });

    it('revokes once per download rather than accumulating URLs', () => {
        downloadFile('one', 'text/csv', 'one.csv');
        downloadFile('two', 'text/csv', 'two.csv');
        downloadFile('three', 'text/csv', 'three.csv');
        vi.runAllTimers();

        expect(createObjectURL).toHaveBeenCalledTimes(3);
        expect(revokeObjectURL).toHaveBeenCalledTimes(3);
    });

    it('still cleans up when the click itself throws', () => {
        HTMLAnchorElement.prototype.click.mockImplementation(() => {
            throw new Error('download blocked');
        });

        expect(() => downloadFile('a', 'text/csv', 'x.csv')).toThrow('download blocked');
        expect(document.querySelectorAll('a[download]')).toHaveLength(0);

        vi.runAllTimers();
        expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });

    it('reports failure instead of throwing where there is no object URL support', () => {
        vi.stubGlobal('URL', { createObjectURL: undefined, revokeObjectURL });
        expect(downloadFile('a', 'text/csv', 'x.csv')).toBe(false);
    });
});
