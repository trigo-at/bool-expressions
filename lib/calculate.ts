import { pipe } from '../utils';
import { OperatorMap, LangSymbol, operatorSymbols, xOfyPattern, isReserved } from './language';
import tokenize from './compiler/tokenizer';
import structure from './compiler/structure';
import execute from './compiler/execute';

const operators: OperatorMap = {
    [operatorSymbols.not]: () => right => !right,
    [operatorSymbols.or]: left => right => left || right,
    [operatorSymbols.and]: left => right => left && right,
    [operatorSymbols.xOfy]: left => (right) => {
        // eslint-disable-next-line no-unused-vars
        const [, x, y] = left.match(xOfyPattern);
        // as soon as x or more of the right operands are true, the function returns true
        return right.filter(op2Element => op2Element).length >= x;
    },
};

const isFulfilled = (state: string[], token: string): boolean => state.indexOf(token) >= 0;

const booleanize = (state: string[]) => (tokens: string[]): LangSymbol[] =>
    tokens.map(token => (isReserved(token) ? token : isFulfilled(state, token)));

/**
 * Evaluates the result of a boolean expression without any variables
 * in the form of "true OR false", "true AND true AND false" etc.
 * @param {string[]} structuredExpression - the expression, preprocessed as a nested, tokenized array
 * @returns {boolean} the result of the boolean expression
 */
export const evaluate = (structuredExpression: string[]): boolean => execute(operators)(structuredExpression);


/**
 * Calculates the result for a boolean expression
 * in the form of "(a AND b) OR c"
 * @param {string} expression - Boolean expression
 * @param {string[]} state - List of variables which are "true"
 * @returns {boolean} Result of the boolean expression
 */
const calculate = (expression: string, state: string[]): boolean =>
    pipe(
        tokenize,
        booleanize(state),
        structure,
        evaluate,
    )(expression);

export default calculate;