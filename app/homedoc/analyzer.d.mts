export interface HomeDocSuggestion {
    title:string;
    category:'bill'|'receipt'|'warranty'|'insurance'|'letter'|'other';
    dueDate:string;amount:string;currency:string;
    evidence:{dueDate:string;amount:string};
    warnings:string[];source:string;reviewRequired:true;
}
export function analyzeOcrText(text:string,name?:string):HomeDocSuggestion;
export function isValidIsoDate(date:string):boolean;
export function sortByDueDate<T extends {dueDate:string}>(records:T[]):T[];
