import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';

test('populated review inputs do not declare overlapping Material text-field hints', () => {
    const screen = fs.readFileSync(new URL('../../app/homedoc/HomeDocHub.svelte', import.meta.url), 'utf8');
    for (const key of ['title', 'dueDate', 'amount', 'currency']) {
        const field = screen.split('\n').find(line => line.includes('text={draft.' + key + '}'));
        assert.ok(field, 'expected ' + key + ' input');
        assert.doesNotMatch(field, /\bhint\s*=/, key + ' input has an overlapping placeholder');
    }
});
