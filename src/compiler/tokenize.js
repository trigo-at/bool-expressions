"use strict";
exports.__esModule = true;
var isWhitespace = function (char) { return char === ' '; };
var isBraces = function (char) { return char === '(' || char === ')'; };
var isSeparator = function (char) { return isWhitespace(char) || isBraces(char); };
var __tokenize = function (result, current, str) {
    if (!str || str.length === 0) {
        if (current.length > 0)
            result.push(current);
        return result;
    }
    var currentChar = str[0];
    if (isSeparator(currentChar)) {
        if (current.length > 0)
            result.push(current);
        if (isBraces(currentChar))
            result.push(currentChar);
        return __tokenize(result, '', str.slice(1));
    }
    return __tokenize(result, current.concat(currentChar), str.slice(1));
};
/** Transforms an expression string into a flat token array
 * @param {string} str - expression string
 * @returns {string[]} tokenized string
 */
var tokenize = function (str) { return __tokenize([], '', str); };
exports["default"] = tokenize;
