"use strict";
exports.__esModule = true;
var _a;
var utils_1 = require("../utils");
var language_1 = require("./language");
var tokenize_1 = require("./compiler/tokenize");
var structure_1 = require("./compiler/structure");
var execute_1 = require("./compiler/execute");
var operators = (_a = {
        "default": function () { return true; }
    },
    _a[language_1.operatorSymbols.not] = function () { return function (right) { return !right; }; },
    _a[language_1.operatorSymbols.or] = function (left) { return function (right) { return left || right; }; },
    _a[language_1.operatorSymbols.and] = function (left) { return function (right) { return left && right; }; },
    _a[language_1.operatorSymbols.xOfy] = function (left) { return function (right) {
        // eslint-disable-next-line no-unused-vars
        var _a = left.match(language_1.xOfyPattern), x = _a[1], y = _a[2];
        // as soon as x or more of the right operands are true, the function returns true
        return right.filter(function (op2Element) { return op2Element; }).length >= x;
    }; },
    _a);
var isFulfilled = function (state, token) { return state.indexOf(token) >= 0; };
var booleanize = function (state) { return function (tokens) {
    return tokens.map(function (token) { return (language_1.isReserved(token) ? token : isFulfilled(state, token)); });
}; };
/**
 * Evaluates the result of a boolean expression without any variables
 * in the form of "true OR false", "true AND true AND false" etc.
 * @param {string[]} structuredExpression - the expression, preprocessed as a nested, tokenized array
 * @returns {boolean} the result of the boolean expression
 */
exports.evaluate = function (structuredExpression) { return execute_1["default"](operators)(structuredExpression); };
/**
 * Calculates the result for a boolean expression
 * in the form of "(a AND b) OR c"
 * @param {string} expression - Boolean expression
 * @param {string[]} state - List of variables which are "true"
 * @returns {boolean} Result of the boolean expression
 */
var calculate = function (expression, state) {
    return utils_1.pipe(tokenize_1["default"], booleanize(state), structure_1["default"], exports.evaluate)(expression);
};
exports["default"] = calculate;
