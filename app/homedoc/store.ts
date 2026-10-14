import { ApplicationSettings } from '@nativescript/core';
import { isValidIsoDate, sortByDueDate } from './analyzer.mjs';

// v1 metadata store is private to the app sandbox, but NOT encrypted.
// Never save the OCR body, images, API tokens, or banking credentials here.
const KEY = 'homedoc.reviewed-metadata.v1';
export type HomeDocCategory = 'bill' | 'receipt' | 'warranty' | 'insurance' | 'letter' | 'other';
export interface HomeDocRecord {
    documentId: string;
    title: string;
    category: HomeDocCategory;
    dueDate: string;
    amount: string;
    currency: string;
    savedAt: number;
    confirmed: true;
}
function validRecord(x: any): x is HomeDocRecord {
    return x && typeof x.documentId === 'string' && x.documentId.length > 0 &&
        typeof x.title === 'string' && (x.dueDate === '' || isValidIsoDate(x.dueDate)) &&
        typeof x.savedAt === 'number' && x.confirmed === true;
}
export function getRecords(): HomeDocRecord[] {
    try {
        const json = JSON.parse(ApplicationSettings.getString(KEY, '[]'));
        return Array.isArray(json) ? sortByDueDate(json.filter(validRecord)) : [];
    } catch (_) { return []; }
}
export function upsertRecord(record: HomeDocRecord) {
    if (!validRecord(record)) throw new Error('Invalid HomeDoc record');
    const records = getRecords().filter(r => r.documentId !== record.documentId);
    records.push(record);
    ApplicationSettings.setString(KEY, JSON.stringify(records));
}
export function removeRecord(documentId: string) {
    ApplicationSettings.setString(KEY, JSON.stringify(getRecords().filter(r => r.documentId !== documentId)));
}
