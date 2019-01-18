'use strict';

const { pipe, flatten, mapRecursive } = require('./utils');

const xOfyPattern = new RegExp('([0-9]+)/([0-9]+)');
const xOfyOperator = 'x/y';
const matches = regEx => str => typeof str === 'string' && str.match(regEx);
const isXofYexpression = matches(xOfyPattern);
const isWhitespace = char => char === ' ';
const isBraces = char => char === '(' || char === ')';
const isSeparator = char => isWhitespace(char) || isBraces(char);
const reservedSymbols = ['OR', 'AND', '\\(', '\\)', xOfyPattern];
const isReserved = token => reservedSymbols.find(res => token.match(res));
const isFulfilled = (state, token) => state.indexOf(token) >= 0;

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
        result.push(xOfyOperator);
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
    return operator === xOfyOperator ?
        operators[operator](leftOperand)(rightOperand) :
        operators[operator](__internalEvaluate([leftOperand]))(__internalEvaluate(rightOperand));
};

const resultOperators = {
    OR: op1 => op2 => op1 || op2,
    AND: op1 => op2 => op1 && op2,
    [xOfyOperator]: op1 => (op2) => {
        const [_, x, y] = op1.match(xOfyPattern);
        return op2.filter(op2Element => op2Element).length >= x;
    },
};

/**
 * Evaluates the result of a boolean expression without any variables
 * in the form of "true OR false", "true AND true AND false" etc.
 * @param {array} structuredExpression - the expression, preprocessed as a nested, tokenized array
 * @returns {bool} the result of the boolean expression
 */
const evaluate = structuredExpression => __evaluate(resultOperators)(structuredExpression);

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

const __augmentOperand = (state, token) => {
    return {
        value: state.indexOf(token) >= 0,
        operand: token,
    };
};

const reductionOperators = {
    OR: op1 => op2 => (op1.value || op2.value ? { value: true } : [op1, 'OR', op2]),
    AND: op1 => (op2) => {
        if (op1.value && op2.value) return { value: true };
        if (op1.value) return [op2];
        if (op2.value) return [op1];
        return [op1, 'AND', op2];
    },
    [xOfyOperator]: op1 => (op2) => {
        const [_, x, y] = op1.match(xOfyPattern);
        const numFulfilled = op2.filter(op => op.value).length;
        const missing = op2.filter(op => !op.value).reduce((acc, cur) => `${acc}${cur.operand} `, '').trim();
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

const __cleanReducedExpression = expr =>
    expr.filter(e => !e.value)
        .map(e => (Array.isArray(e) && e.length === 1 ? e[0] : e))
        .map(e => e.operand || e);

const __normalizeReductionResult = reductionResult =>
    (Array.isArray(reductionResult) ? reductionResult : [reductionResult]);

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
        __normalizeReductionResult,
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
