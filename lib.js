'use strict';

const { pipe, flatten, mapRecursive, matches } = require('./utils');

const operatorSymbols = {
    and: 'AND',
    or: 'OR',
    xOfy: 'X/Y',
};
const xOfyPattern = new RegExp('([0-9]+)/([0-9]+)');
const reservedSymbols = [
    operatorSymbols.or,
    operatorSymbols.and,
    xOfyPattern,
    '\\(',
    '\\)',
];
const isReserved = token => reservedSymbols.find(symbol => token.match(symbol));
const isXofYexpression = matches(xOfyPattern);
const isWhitespace = char => char === ' ';
const isBraces = char => char === '(' || char === ')';
const isSeparator = char => isWhitespace(char) || isBraces(char);

const __tokenize = (result, current, str) => {
    if (!str || str.length === 0) {
        if (current.length > 0) result.push(current);
        return result;
    }
    const currentChar = str[0];

    if (isSeparator(currentChar)) {
        if (current.length > 0) result.push(current);
        if (isBraces(currentChar)) result.push(currentChar);
        return __tokenize(result, '', str.slice(1));
    }

    return __tokenize(result, current.concat(currentChar), str.slice(1));
};

/** Transforms an expression string into a flat token array
 * @param {string} str - expression string
 * @returns {array} tokenized string
 */
const tokenize = str => __tokenize([], '', str);

const __structure = (result, tokens) => {
    // once we are at the end of the token array or encounter a closing brace -> cut off
    if (tokens.length === 0 || tokens[0] === ')') {
        return result;
    }
    const currentToken = tokens[0];

    // if we encounter an opening brace, we open a new recursion to get nesting
    if (currentToken === '(') {
        const nestedStruct = __structure([], tokens.slice(1));
        result.push(nestedStruct);
        const flatResult = flatten(nestedStruct);
        // we have to slice off the number of processed tokens + 2 braces per depth level
        const numAlreadyProcessedTokens = flatResult.result.length + (flatResult.allArrays.length * 2);
        return __structure(result, tokens.slice(numAlreadyProcessedTokens));
    }

    result.push(currentToken);

    // insert "x/y" token into structure so that every operator follows
    // the <operand 1> <operator> <operand2> notation
    if (isXofYexpression(currentToken)) {
        result.push(operatorSymbols.xOfy);
    }
    return __structure(result, tokens.slice(1));
};

/**
 * Transform a token array into a nested structure, based on bracing
 * @param {array} tokens - the flat token array
 * @returns {array} a nested token array, braces removed
 */
const structure = tokens => __structure([], tokens);

const __evaluate = operators => function __internalEvaluate(structuredExpression) {
    if (!structuredExpression || structuredExpression.length === 0) return false;
    const [leftOperand, operator, ...rightOperand] = structuredExpression;
    if (structuredExpression.length === 1) {
        return Array.isArray(leftOperand) ? __internalEvaluate(leftOperand) : leftOperand;
    }

    // the x/y operator is special in that the left operand is not really an operand
    // and the right operand is not to be continued with folding because
    // the remaining list belongs to the x/y operation
    return operator === operatorSymbols.xOfy ?
        operators[operator](leftOperand)(rightOperand) :
        operators[operator](__internalEvaluate([leftOperand]))(__internalEvaluate(rightOperand));
};

const resultOperators = {
    [operatorSymbols.or]: left => right => left || right,
    [operatorSymbols.and]: left => right => left && right,
    [operatorSymbols.xOfy]: left => (right) => {
        // eslint-disable-next-line no-unused-vars
        const [, x, y] = left.match(xOfyPattern);
        // as soon as x or more of the right operands are true, the function returns true
        return right.filter(op2Element => op2Element).length >= x;
    },
};

/**
 * Evaluates the result of a boolean expression without any variables
 * in the form of "true OR false", "true AND true AND false" etc.
 * @param {array} structuredExpression - the expression, preprocessed as a nested, tokenized array
 * @returns {bool} the result of the boolean expression
 */
const evaluate = structuredExpression => __evaluate(resultOperators)(structuredExpression);

const isFulfilled = (state, token) => state.indexOf(token) >= 0;

const __booleanize = state => tokens =>
    tokens.map(token => (isReserved(token) ? token : isFulfilled(state, token)));

/**
 * Calculates the result for a boolean expression
 * in the form of "(a AND b) OR c"
 * @param {string} expression - Boolean expression
 * @param {array} state - List of variables which are "true"
 * @returns {bool} Result of the boolean expression
 */
const calculate = (expression, state) =>
    pipe(
        tokenize,
        __booleanize(state),
        structure,
        evaluate,
    )(expression);

const __augmentOperand = (state, token) => ({
    value: isFulfilled(state, token),
    operand: token,
});

const reductionOperators = {
    [operatorSymbols.or]: left => right =>
        (left.value || right.value ? { value: true } : [left, operatorSymbols.or, right]),
    [operatorSymbols.and]: left => (right) => {
        if (left.value && right.value) return { value: true };
        if (left.value) return [right];
        if (right.value) return [left];
        return [left, operatorSymbols.and, right];
    },
    [operatorSymbols.xOfy]: left => (right) => {
        const [, x, y] = left.match(xOfyPattern);
        // first we check how many of the operands are already true
        const numFulfilled = right.filter(op => op.value).length;
        // then we eliminate all true operands from the list and construct a list of their names
        // so a updated expression with the current remaining requirements can be constructed
        const missing = right.filter(op => !op.value).reduce((acc, cur) => `${acc}${cur.operand} `, '').trim();
        // this is then "squashed" into the operand property (even though it's not an operand)
        return numFulfilled >= x ?
            { value: true } :
            {
                value: false,
                operand: `${x - numFulfilled}/${y - numFulfilled} ${missing}`,
            };
    },
};

const __reduce = structuredExpression => __evaluate(reductionOperators)(structuredExpression);

const __calculateTokens = state => tokens =>
    tokens.map(token => (isReserved(token) ? token : __augmentOperand(state, token)));

const __cleanReducedExpression = expression =>
    expression.filter(part => !part.value)
        .map(part => (Array.isArray(part) && part.length === 1 ? part[0] : part))
        .map(part => part.operand || part);

const __normalizeToArray = obj => (Array.isArray(obj) ? obj : [obj]);

/** Reduces a boolean expression by eliminating all "true" operands and sub expressions
 * @param {string} expression - the boolean expression string
 * @param {array} state - all variables which are "true"
 * @returns {array} A tokenized, structured (nested) array of expressions which have to be fulfilled to get a "true"
 * result from the input expression
 */
const reduce = (expression, state) =>
    pipe(
        tokenize,
        __calculateTokens(state),
        structure,
        __reduce,
        __normalizeToArray,
        mapRecursive(__cleanReducedExpression),
    )(expression);

module.exports = {
    evaluate,
    tokenize,
    structure,
    reduce,
    calculate,
    pipe,
};
