'use strict';
exports.__esModule = true;
var __flatten = function (_a, arr) {
    var result = _a.result, allArrays = _a.allArrays;
    if (!arr || arr.length === 0)
        return { result: result, allArrays: allArrays };
    if (Array.isArray(arr[0])) {
        allArrays.push(arr[0]);
        __flatten({ result: result, allArrays: allArrays }, arr[0]);
    }
    else {
        result.push(arr[0]);
    }
    return __flatten({ result: result, allArrays: allArrays }, arr.slice(1));
};
/**
 * Flattens an array and collects all nested arrays in a separate data structure
 * @param {array} arr - nested array
 * @return {object} a flattened in "result" and all nested arrays in "allArrays"
 */
var flatten = function (arr) { return __flatten({ result: [], allArrays: [arr] }, arr); };
exports.flatten = flatten;
var __mapRecursive = function (action) { return function __innerRecursion(result, array) {
    if (!array || array.length === 0)
        return action(result);
    var node = array[0];
    if (Array.isArray(node)) {
        result.push(__innerRecursion([], node));
    }
    else {
        result.push(node);
    }
    return __innerRecursion(result, array.slice(1));
}; };
/**
 * Walks a all elements in a nested array in post order and executes a function on them
 * the original array is not modified
 * @param {function} action - The function to execute on all elements
 * @param {array} array - the nested array
 * @returns {array} a new array with the function applied to all elements
 */
var mapRecursive = function (action) { return function (array) { return __mapRecursive(action)([], array); }; };
exports.mapRecursive = mapRecursive;
var pipe = function () {
    var functions = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        functions[_i] = arguments[_i];
    }
    return function (arg) { return functions.reduce(function (acc, cur) { return cur(acc); }, arg); };
};
exports.pipe = pipe;
var matches = function (regEx) { return function (str) { return typeof str === 'string' && !!str.match(regEx); }; };
exports.matches = matches;
