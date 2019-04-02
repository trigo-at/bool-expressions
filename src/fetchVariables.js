"use strict";
exports.__esModule = true;
var utils_1 = require("../utils");
var language_1 = require("./language");
var tokenize_1 = require("./compiler/tokenize");
var filterReservedSymbols = function (tokenArray) {
    return tokenArray.filter(function (token) { return !language_1.isReserved(token); });
};
var deduplicate = function (array) {
    return array.filter(function (token, pos) { return array.indexOf(token) === pos; });
};
var fetchVariables = function (expression) {
    return utils_1.pipe(tokenize_1["default"], filterReservedSymbols, deduplicate)(expression);
};
exports["default"] = fetchVariables;
