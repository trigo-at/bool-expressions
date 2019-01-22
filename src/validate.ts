import { pipe } from '../utils';
import { OperatorMap, LangSymbol, operatorSymbols, xOfyPattern, isReserved } from './language';
import tokenize from './compiler/tokenize';
import structure from './compiler/structure';
import execute from './compiler/execute';

const hasLeftAndRightOperand = (left, right) => left && right;

const operators: OperatorMap = {
    default: () => false,
    [operatorSymbols.or]: left => right => hasLeftAndRightOperand(left, right),
    [operatorSymbols.and]: left => right => hasLeftAndRightOperand(left, right),
    [operatorSymbols.not]: () => right => right,
    [operatorSymbols.xOfy]: left => right => {
        const [, x, y] = left.match(xOfyPattern).map(x => Number.parseInt(x, 10));
        if (!Number.isInteger(x) || !Number.isInteger(y)) return false;
        return right.length > 0 && right.length === y && x > 0 && x <= y;
    },
};

const innerValidate = (structuredExpression: string[]): boolean => {
    const result = execute(operators)(structuredExpression);
    return result !== false && !Array.isArray(result);
};

const hasMatchingBraces = (tokenArray: string[]): boolean => {
    return tokenArray.filter(token => token === '(').length === tokenArray.filter(token => token ===')').length;
};

const booleanize = (tokens: string[]): LangSymbol[] =>
    tokens.map(token => (isReserved(token) ? token : true));

const validate = (expression: string): boolean => {
    const tokenizedExpression = tokenize(expression);
    return hasMatchingBraces(tokenizedExpression) && 
        pipe(
            booleanize,
            structure,
            innerValidate,
        )(tokenizedExpression);
};

export default validate;