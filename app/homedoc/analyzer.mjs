/**
 * HomeDoc AI — conservative, offline OCR hints (no model calls).
 * This module MUST NOT invent missing fields. Every suggestion is editable.
 * MIT, HomeDoc starter. Does not use the original scanner's code.
 */
const LABEL_DATE = /(?:due\s*date|payment\s*due|pay\s*by|payable\s*before|expiry\s*date|expires?\s*(?:on)?|valid\s*until|warranty\s*until|scadenza|da\s*pagare\s*entro|entro\s*il|data\s*di\s*scadenza|date\s*d['’]échéance|échéance|avant\s*le|fecha\s*de\s*vencimiento|vencimiento)/i;
const ISO_DATE = /\b(20\d\d|19\d\d)[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])\b/g;
const DAY_DATE = /\b(0?[1-9]|[12]\d|3[01])([/.\-])(0?[1-9]|1[0-2])\2(20\d\d|19\d\d)\b/g;
const MONEY_LABEL = /(?:amount\s*due|total\s*(?:due|payable)|balance\s*due|importo\s*da\s*pagare|totale\s*da\s*pagare|montant\s*(?:à\s*payer|du)|net\s*à\s*payer|total\s*à\s*payer|importe\s*total)/i;
const CATEGORIES = [
  ['bill', /\b(invoice|bill|utility|electricity|gas|fattura|bolletta|facture|rechnu?ng)\b/i],
  ['warranty', /\b(warranty|guarantee|garanzia|garantie)\b/i],
  ['insurance', /\b(insurance|policy|assicurazione|polizza|assurance)\b/i],
  ['receipt', /\b(receipt|scontrino|ricevuta|ticket\s*de\s*caisse)\b/i],
  ['letter', /\b(letter|notification|lettera|comunicazione|courrier)\b/i],
];
const pad = v => String(v).padStart(2, '0');
function toISO(year, month, day) {
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (dt.getUTCFullYear() !== year || dt.getUTCMonth() !== month - 1 || dt.getUTCDate() !== day) return null;
  return `${year}-${pad(month)}-${pad(day)}`;
}
function dateTokens(line) {
  const found = [];
  for (const m of line.matchAll(ISO_DATE)) {
    const date = toISO(+m[1], +m[2], +m[3]);
    if (date) found.push({date, raw:m[0], ambiguous:false});
  }
  for (const m of line.matchAll(DAY_DATE)) {
    const day = +m[1], month = +m[3], year = +m[4];
    const date = toISO(year, month, day);
    if (date) found.push({date, raw:m[0], ambiguous:day <= 12 && month <= 12 && day !== month});
  }
  return found;
}
function parseMoney(candidate) {
  let raw = candidate.replace(/\s/g, '').replace(/[€$£]/g,'');
  if (!/^\d[\d.,]*$/.test(raw)) return null;
  const comma = raw.lastIndexOf(','), dot = raw.lastIndexOf('.');
  const sep = Math.max(comma, dot);
  if (sep >= 0) {
    const decimals = raw.length - sep - 1;
    if (decimals === 2) raw = raw.slice(0, sep).replace(/[.,]/g, '') + '.' + raw.slice(sep + 1);
    else if (decimals === 3 && /^\d{1,3}$/.test(raw.slice(sep + 1))) raw = raw.replace(/[.,]/g,'');
    else if (decimals === 0 || decimals > 3) return null;
    else if (decimals === 1) raw = raw.slice(0, sep).replace(/[.,]/g, '') + '.' + raw.slice(sep + 1);
  }
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 && value <= 1e9 ? value : null;
}
export function analyzeOcrText(text, name = 'Untitled document') {
  const lines = String(text || '').replace(/\r/g,'').split('\n').map(line => line.trim()).filter(Boolean);
  const joined = lines.join(' ').slice(0, 50000);
  const category = CATEGORIES.find(([, regex]) => regex.test(joined))?.[0] || 'other';
  const warnings = [];
  const candidateDates = [];
  for (let i = 0; i < lines.length; i++) {
    if (!LABEL_DATE.test(lines[i])) continue;
    for (const line of [lines[i], lines[i + 1] || '']) {
      for (const d of dateTokens(line)) candidateDates.push({...d, source:lines[i]});
    }
  }
  const uniqueDates = [...new Map(candidateDates.map(d => [d.date, d])).values()];
  let dueDate = '';
  if (uniqueDates.length === 1) {
    if (uniqueDates[0].ambiguous) warnings.push(`Ambiguous date format: ${uniqueDates[0].raw}. Enter and verify the due date manually.`);
    else dueDate = uniqueDates[0].date;
  } else if (uniqueDates.length > 1) {
    warnings.push('Several deadline dates were found. Verify the correct one manually.');
  }
  let amount = '', currency = '';
  for (let i = 0; i < lines.length; i++) {
    if (!MONEY_LABEL.test(lines[i])) continue;
    const chunk = (lines[i] + ' ' + (lines[i+1] || '')).slice(0, 250);
    const labelMatch = MONEY_LABEL.exec(chunk);
    const suffix = chunk.slice((labelMatch?.index || 0) + (labelMatch?.[0]?.length || 0));
    // Currency sign optional, but require explicit amount label. Avoid invoice numbers.
    const match = suffix.match(/(?:EUR|USD|GBP|€|\$|£)?\s*(\d{1,3}(?:[.,\s]\d{3})+(?:[.,]\d{2})?|\d{1,9}(?:[.,]\d{2})?)(?:\s*(EUR|USD|GBP|€|\$|£))?/i);
    if (!match) continue;
    const value = parseMoney(match[1]);
    if (value === null) continue;
    amount = value.toFixed(2);
    const label = (suffix.slice(0, match.index) + ' ' + (match[2] || '')).toUpperCase();
    currency = /€|EUR/.test(chunk.toUpperCase()) ? 'EUR' : /\$|USD/.test(chunk.toUpperCase()) ? 'USD' : /£|GBP/.test(chunk.toUpperCase()) ? 'GBP' : '';
    break;
  }
  if (lines.length === 0) warnings.push('No OCR text found. Run OCR in the scanner before analyzing this document.');
  if (!dueDate && candidateDates.length === 0) warnings.push('No clearly labelled deadline was found.');
  if (!currency && amount) warnings.push('Currency not verified.');
  return {title:String(name || 'Untitled document').slice(0,150),category,dueDate,amount,currency,
    evidence:{dueDate:uniqueDates[0]?.source || '', amount:amount ? 'OCR total/amount label' : ''},
    warnings, source:'offline-rules', reviewRequired:true};
}
export function isValidIsoDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s||''));
  return !!m && !!toISO(+m[1], +m[2], +m[3]);
}
export function sortByDueDate(records) {
  return [...records].sort((a,b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'));
}
