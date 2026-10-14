import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';

const source = fs.readFileSync(new URL('../../app/homedoc/HomeDocHub.svelte', import.meta.url), 'utf8');
const scanner = fs.readFileSync(new URL('../../app/services/ocr.ts', import.meta.url), 'utf8');

test('three HomeDoc OCR quality choices correspond to real scanner model families', () => {
    for (const mode of ['fast', 'standard', 'best']) {
        assert.ok(source.includes("selectOCRQuality('" + mode + "')"), mode + ' option not available');
    }
    assert.match(source, /ocrService\.dataType\s*=\s*mode/);
    assert.match(scanner, /ApplicationSettings\.setString\('tesseract_datatype', value\)/);
    for (const family of ['tessdata_fast', 'tessdata_best', 'tessdata']) {
        assert.ok(scanner.includes(family), family + ' missing from scanner OCR downloads');
    }
});

test('HomeDoc OCR settings checks language availability before download', () => {
    assert.match(source, /checkOrDownloadOCRLanguages\(\{/);
    assert.match(source, /ocrService\.downloadedLanguages/);
    assert.match(source, /ocrQualityDescription/);
    assert.match(source, /Changing quality will not update older scans/);
});
