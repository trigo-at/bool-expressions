'use strict';

const { expect } = require('chai');
const {
    reduce,
    tokenize,
    structure,
    evaluate,
    calculate,
} = require('./lib');

const executeSpec = testFunction => (testInput) => {
    const [expression, state, expectedResult] = testInput;
    it(`should ${testFunction.name} "${expression}" if ${state} to be ${expectedResult}`, () => {
        expect(testFunction(expression, state)).to.deep.eql(expectedResult);
    });
};

describe('tokenization', () => {
    [
        ['a AND b', null, ['a', 'AND', 'b']],
        ['   a  AND b    ', null, ['a', 'AND', 'b']],
        ['(a AND b)', null, ['(', 'a', 'AND', 'b', ')']],
        ['2/3 a b c', null, ['2/3', 'a', 'b', 'c']],
        ['((a AND b) OR (c AND d)) OR e', null, ['(', '(', 'a', 'AND', 'b', ')', 'OR', '(', 'c', 'AND', 'd', ')', ')', 'OR', 'e']],
    ].forEach(executeSpec(tokenize));
});

describe('structuring', () => {
    [
        [['a', 'AND', 'b'], null, ['a', 'AND', 'b']],
        [['(', 'a', 'AND', 'b', ')'], null, [['a', 'AND', 'b']]],
        [['2/3', 'a', 'b', 'c'], null, ['2/3', 'x/y', 'a', 'b', 'c']],
        [['(', '(', 'a', 'AND', 'b', ')', ')', 'OR', 'e'], null, [[['a', 'AND', 'b']], 'OR', 'e']],
        [['(', '(', 'a', 'AND', 'b', ')', 'OR', '(', 'c', 'AND', 'd', ')', ')', 'OR', 'e'], null, [[['a', 'AND', 'b'], 'OR', ['c', 'AND', 'd']], 'OR', 'e']],
    ].forEach(executeSpec(structure));
});

describe('evaluation', () => {
    [
        [['2/3', 'x/y', true, true, true], null, true],
        [['2/3', 'x/y', true, true, false], null, true],
        [['2/3', 'x/y', true, false, false], null, false],
    ].forEach(executeSpec(evaluate));
});

describe('calculate expression result', () => {
    [
        ['a', ['a'], true],
        ['a', ['b'], false],
        ['a AND b', ['a'], false],
        ['(a AND b)', ['a'], false],
        ['a AND b', ['b'], false],
        ['a AND b', ['a', 'b'], true],
        ['(a AND b)', ['a', 'b'], true],
        ['(a AND b) OR c', ['c'], true],
        ['(a AND b) OR c', ['a', 'b'], true],
        ['(a AND b) OR (c AND d)', ['a', 'c'], false],
        ['(a AND b) OR (c AND d)', ['a', 'b'], true],
        ['((a AND b) OR (c AND d)) OR e', ['e'], true],
        ['2/3 a b c', ['a', 'b'], true],
        ['(a AND b) OR (c AND d) OR (2/3 a b c)', ['b', 'c'], true],
    ].forEach(executeSpec(calculate));
});

describe('reduce to missing states', () => {
    [
        ['a OR b', ['a'], []],
        ['a OR b', ['b'], []],
        ['a OR b', [], ['a', 'OR', 'b']],
        ['a OR b OR c', ['b'], []],
        ['a AND b', ['a'], ['b']],
        ['a AND b', ['b'], ['a']],
        ['a AND b', ['a', 'b'], []],
        ['(a AND b) OR c', ['a', 'c'], []],
        ['a AND b OR c', ['a', 'c'], []],
        ['(a AND b) OR (c AND d)', ['a', 'c'], ['b', 'OR', 'd']],
        ['(a AND b) OR (c AND d) OR e', ['a', 'c'], ['b', 'OR', ['d', 'OR', 'e']]],
        ['(a AND b) OR (c AND d)', ['a', 'b'], []],
        ['2/3 a b c', ['a'], ['1/2 b c']],
    ].forEach(executeSpec(reduce));
});
