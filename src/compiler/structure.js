"use strict";
exports.__esModule = true;
var utils_1 = require("../../utils");
var language_1 = require("../language");
var __structure = function (result, tokens) {
    // once we are at the end of the token array or encounter a closing brace -> cut off
    if (tokens.length === 0 || tokens[0] === ')') {
        return result;
    }
    var currentToken = tokens[0];
    // if we encounter an opening brace, we open a new recursion to get nesting
    if (currentToken === '(') {
        var nestedStruct = __structure([], tokens.slice(1));
        result.push(nestedStruct);
        var flatResult = utils_1.flatten(nestedStruct);
        // we have to slice off the number of processed tokens + 2 braces per depth level
        // X/Y have to be filtered out because we add them to the expression
        var numAlreadyProcessedTokens = flatResult.result.filter(function (x) { return x !== language_1.operatorSymbols.xOfy && x !== '_'; }).length + (flatResult.allArrays.length * 2);
        return __structure(result, tokens.slice(numAlreadyProcessedTokens));
    }
    if (currentToken === language_1.operatorSymbols.not) {
        result.push('_');
    }
    result.push(currentToken);
    // insert "x/y" token into structure so that every operator follows
    // the <operand 1> <operator> <operand2> notation
    if (language_1.isXofYexpression(currentToken)) {
        result.push(language_1.operatorSymbols.xOfy);
    }
    return __structure(result, tokens.slice(1));
};
/**
 * Transform a token array into a nested structure, based on bracing
 * @param {string[]} tokens - the flat token array
 * @returns {string[]} a nested token array, braces removed
 */
var structure = function (tokens) { return __structure([], tokens); };
exports["default"] = structure;
