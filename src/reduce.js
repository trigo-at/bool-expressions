"use strict";
exports.__esModule = true;
var _a;
var utils_1 = require("../utils");
var language_1 = require("./language");
var structure_1 = require("./compiler/structure");
var tokenize_1 = require("./compiler/tokenize");
var execute_1 = require("./compiler/execute");
var isTrue = function (operand) { return (Array.isArray(operand) && operand.length === 0) || (operand && operand.value); };
var operators = (_a = {
        "default": function () { return []; }
    },
    _a[language_1.operatorSymbols.not] = function () { return function (right) {
        return (isTrue(right) ? [language_1.operatorSymbols.not, right] : []);
    }; },
    _a[language_1.operatorSymbols.or] = function (left) { return function (right) {
        return (isTrue(left) || isTrue(right) ? [] : [left, language_1.operatorSymbols.or, right]);
    }; },
    _a[language_1.operatorSymbols.and] = function (left) { return function (right) {
        if (isTrue(left) && isTrue(right))
            return [];
        if (isTrue(left))
            return [right];
        if (isTrue(right))
            return [left];
        return [left, language_1.operatorSymbols.and, right];
    }; },
    _a[language_1.operatorSymbols.xOfy] = function (left) { return function (right) {
        var _a = left.match(language_1.xOfyPattern), x = _a[1], y = _a[2];
        // first we check how many of the operands are already true
        var numFulfilled = right.filter(function (op) { return isTrue(op); }).length;
        // then we eliminate all true operands from the list and construct a list of their names
        // so a updated expression with the current remaining requirements can be constructed
        return numFulfilled >= x ?
            [] : [x - numFulfilled + "/" + (y - numFulfilled)].concat(right.filter(function (op) { return !isTrue(op); }));
    }; },
    _a);
var isFulfilled = function (state, token) { return state.indexOf(token) >= 0; };
var augmentOperand = function (state, token) { return ({
    value: isFulfilled(state, token),
    operand: token
}); };
var calculateTokens = function (state) { return function (tokens) {
    return tokens.map(function (token) { return (language_1.isReserved(token) ? token : augmentOperand(state, token)); });
}; };
var reduceStructuredExpression = function (structuredExpression) { return execute_1["default"](operators)(structuredExpression); };
var cleanReducedExpression = function (expression) {
    return expression
        .map(function (part) { return (Array.isArray(part) && part.length === 1 ? part[0] : part); })
        .map(function (part) { return part.operand || part; });
};
var normalizeToArray = function (obj) { return (Array.isArray(obj) ? obj : [obj]); };
/** Reduces a boolean expression by eliminating all "true" operands and sub expressions
 * @param {string} expression - the boolean expression string
 * @param {string[]} state - all variables which are "true"
 * @returns {string[]} A tokenized, structured (nested) array of expressions which have to be fulfilled to get a "true"
 * result from the input expression
 */
var reduce = function (expression, state) {
    return utils_1.pipe(tokenize_1["default"], calculateTokens(state), structure_1["default"], reduceStructuredExpression, normalizeToArray, utils_1.mapRecursive(cleanReducedExpression))(expression);
};
exports["default"] = reduce;
