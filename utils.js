'use strict';

const __flatten = ({ result, allArrays }, arr) => {
    if (!arr || arr.length === 0) return { result, allArrays };
    if (Array.isArray(arr[0])) {
        allArrays.push(arr[0]);
        __flatten({ result, allArrays }, arr[0]);
    } else {
        result.push(arr[0]);
    }
    return __flatten({ result, allArrays }, arr.slice(1));
};

/**
 * Flattens an array and collects all nested arrays in a separate data structure
 * @param {array} arr - nested array
 * @return {object} a flattened in "result" and all nested arrays in "allArrays"
 */
const flatten = arr => __flatten({ result: [], allArrays: [arr] }, arr);

const __mapRecursive = action => function __innerRecursion(result, array) {
    if (!array || array.length === 0) return action(result);
    const node = array[0];
    if (Array.isArray(node)) {
        result.push(__innerRecursion([], node));
    } else {
        result.push(node);
    }
    return __innerRecursion(result, array.slice(1));
};

/**
 * Walks a all elements in a nested array in post order and executes a function on them
 * the original array is not modified
 * @param {function} action - The function to execute on all elements
 * @param {array} array - the nested array
 * @returns {array} a new array with the function applied to all elements
 */
const mapRecursive = action => array => __mapRecursive(action)([], array);

const pipe = (...functions) => arg => functions.reduce((acc, cur) => cur(acc), arg);

const matches = regEx => str => typeof str === 'string' && str.match(regEx);

module.exports = {
    flatten,
    mapRecursive,
    pipe,
    matches,
};
