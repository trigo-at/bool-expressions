"use strict";
exports.__esModule = true;
var language_1 = require("../language");
var execute = function (operators) { return function __internalEvaluate(structuredExpression) {
    // if the expression consists of only a value, we return it immediately
    if (!Array.isArray(structuredExpression))
        return structuredExpression;
    if (structuredExpression.length === 0)
        return operators["default"]();
    var leftOperand = structuredExpression[0], operator = structuredExpression[1], rightOperand = structuredExpression.slice(2);
    if (structuredExpression.length === 1) {
        return Array.isArray(leftOperand) ? __internalEvaluate(leftOperand) : leftOperand;
    }
    // if we find a boolean, an augmented operand or an array where the operator should be,
    // we have a operand list (e.g. X/Y operator), so we have to abort the fold and map all operands in the list
    // to their evaluated value
    return typeof operator === 'boolean' || language_1.isOperand(operator) || Array.isArray(operator) ?
        structuredExpression.map(function (expr) { return __internalEvaluate(expr); }) :
        operators[operator](__internalEvaluate([leftOperand]))(__internalEvaluate(rightOperand));
}; };
exports["default"] = execute;