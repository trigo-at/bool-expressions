import { pipe, mapRecursive } from '../utils';
import { OperatorMap, Operand, isReserved, operatorSymbols, isXofYexpression, xOfyPattern } from './language';
import structure from './compiler/structure';
import tokenize from './compiler/tokenizer';
import execute from './compiler/execute';

const isTrue = operand => (Array.isArray(operand) && operand.length === 0) || (operand && operand.value);

const operators: OperatorMap = {
    [operatorSymbols.not]: () => right =>
        (isTrue(right) ? [operatorSymbols.not, right] : []),
    [operatorSymbols.or]: left => right =>
        (isTrue(left) || isTrue(right) ? [] : [left, operatorSymbols.or, right]),
    [operatorSymbols.and]: left => (right) => {
        if (isTrue(left) && isTrue(right)) return [];
        if (isTrue(left)) return [right];
        if (isTrue(right)) return [left];
        return [left, operatorSymbols.and, right];
    },
    [operatorSymbols.xOfy]: left => (right) => {
        const [, x, y] = left.match(xOfyPattern);
        // first we check how many of the operands are already true
        const numFulfilled = right.filter(op => op.value).length;
        // then we eliminate all true operands from the list and construct a list of their names
        // so a updated expression with the current remaining requirements can be constructed
        const missing = right.filter(op => !isTrue(op)).reduce((acc, cur) => `${acc}${cur.operand} `, '').trim();
        // this is then "squashed" into the operand property (even though it's not an operand)
        return numFulfilled >= x ?
            { value: true } :
            {
                value: false,
                operand: `${x - numFulfilled}/${y - numFulfilled} ${missing}`,
            };
    },
};

const isFulfilled = (state: string[], token: string): boolean => state.indexOf(token) >= 0;

const augmentOperand = (state: string[], token: string): Operand => ({
    value: isFulfilled(state, token),
    operand: token,
});

const calculateTokens = (state: string[]) => (tokens: string[]) =>
    tokens.map(token => (isReserved(token) ? token : augmentOperand(state, token)));

const reduceStructuredExpression = (structuredExpression: string[]) => execute(operators)(structuredExpression);

const cleanReducedExpression = expression =>
    expression
        .map(part => (Array.isArray(part) && part.length === 1 ? part[0] : part))
        .map(part => part.operand || part);

const normalizeToArray = obj => (Array.isArray(obj) ? obj : [obj]);

/** Reduces a boolean expression by eliminating all "true" operands and sub expressions
 * @param {string} expression - the boolean expression string
 * @param {string[]} state - all variables which are "true"
 * @returns {string[]} A tokenized, structured (nested) array of expressions which have to be fulfilled to get a "true"
 * result from the input expression
 */
const reduce = (expression: string, state: string[]): string[] =>
    pipe(
        tokenize,
        calculateTokens(state),
        structure,
        reduceStructuredExpression,
        normalizeToArray,
        mapRecursive(cleanReducedExpression),
    )(expression);

export default reduce;