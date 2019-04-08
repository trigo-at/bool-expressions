import { matches } from '../utils';

export interface Operand {
    value: boolean,
    operand: string,
}

export function isOperand(obj: any): obj is Operand {
    return (<Operand>obj).operand !== undefined;
}

export type LangSymbol = string | boolean;

export interface OperatorMap {
    [symbol: string]: Function
}

export const operatorSymbols = {
    and: 'AND',
    or: 'OR',
    xOfy: 'X/Y',
    not: 'NOT',
};

export const operatorSymbolsRegEx = {
    and: /^AND$/,
    or: /^OR$/,
    xOfy: /^X\/Y$/,
    not: /^NOT$/,
};

export const xOfyPattern = new RegExp('([0-9]+)/([0-9]+)');

export const reservedSymbols = [
    ...Object.values(operatorSymbolsRegEx),
    xOfyPattern,
    '\\(',
    '\\)',
];
export const isReserved = (token: string): boolean => (typeof token === 'string' && !!reservedSymbols.find(symbol => !!token.match(symbol)));

export const isXofYexpression = matches(xOfyPattern);
