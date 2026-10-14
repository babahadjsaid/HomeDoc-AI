import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { analyzeOcrText } from '../../app/homedoc/analyzer.mjs';

test('synthetic Italian TARI PDF text extracts the billed amount and deadline', () => {
    const text = fs.readFileSync(new URL('../fixtures/TARI_2027_text_extract.txt', import.meta.url), 'utf8');
    const fields = analyzeOcrText(text, 'TARI 2027 - simulated notice');
    assert.equal(fields.category, 'bill');
    assert.equal(fields.dueDate, '2027-07-31');
    assert.equal(fields.amount, '73.20');
    assert.equal(fields.currency, 'EUR');
    assert.equal(fields.reviewRequired, true);
});
