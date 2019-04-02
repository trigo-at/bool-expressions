"use strict";
exports.__esModule = true;
var _a;
var utils_1 = require("../utils");
var language_1 = require("./language");
var tokenize_1 = require("./compiler/tokenize");
var structure_1 = require("./compiler/structure");
var execute_1 = require("./compiler/execute");
var hasLeftAndRightOperand = function (left, right) { return left && right; };
var operators = (_a = {
        "default": function () { return false; }
    },
    _a[language_1.operatorSymbols.or] = function (left) { return function (right) { return hasLeftAndRightOperand(left, right); }; },
    _a[language_1.operatorSymbols.and] = function (left) { return function (right) { return hasLeftAndRightOperand(left, right); }; },
    _a[language_1.operatorSymbols.not] = function () { return function (right) { return right; }; },
    _a[language_1.operatorSymbols.xOfy] = function (left) { return function (right) {
        var _a = left.match(language_1.xOfyPattern).map(function (x) { return Number.parseInt(x, 10); }), x = _a[1], y = _a[2];
        if (!Number.isInteger(x) || !Number.isInteger(y))
            return false;
        return right.length > 0 && right.length === y && x > 0 && x <= y;
    }; },
    _a);
var innerValidate = function (structuredExpression) {
    var result = execute_1["default"](operators)(structuredExpression);
    return result !== false && !Array.isArray(result);
};
var hasMatchingBraces = function (tokenArray) {
    return tokenArray.filter(function (token) { return token === '('; }).length === tokenArray.filter(function (token) { return token === ')'; }).length;
};
var booleanize = function (tokens) {
    return tokens.map(function (token) { return (language_1.isReserved(token) ? token : true); });
};
var validate = function (expression) {
    var tokenizedExpression = tokenize_1["default"](expression);
    if (tokenizedExpression.length === 0)
        return true;
    return hasMatchingBraces(tokenizedExpression) &&
        utils_1.pipe(booleanize, structure_1["default"], innerValidate)(tokenizedExpression);
};
exports["default"] = validate;
