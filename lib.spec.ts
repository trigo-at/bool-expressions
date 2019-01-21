/* eslint max-len: "off" */

'use strict';

import { expect } from 'chai';
import { reduce, calculate } from './lib';
import tokenize from './lib/compiler/tokenize';
import structure from './lib/compiler/structure';
import { evaluate } from './lib/calculate';

const executeSpec = testFunction => (testInput) => {
    const [expression, state, expectedResult] = testInput;
    it(`should ${testFunction.name} "${expression}" if ${state} to be ${expectedResult}`, () => {
        expect(testFunction(expression, state)).to.deep.eq(expectedResult);
    });
};

describe('tokenization', () => {
    [
        ['a AND b', null, ['a', 'AND', 'b']],
        ['   a  AND b    ', null, ['a', 'AND', 'b']],
        ['(a AND b)', null, ['(', 'a', 'AND', 'b', ')']],
        ['2/3 a b c', null, ['2/3', 'a', 'b', 'c']],
        ['((a AND b) OR (c AND d)) OR e', null, ['(', '(', 'a', 'AND', 'b', ')', 'OR', '(', 'c', 'AND', 'd', ')', ')', 'OR', 'e']],
        ['2/3 a b (1/2 c d)', null, ['2/3', 'a', 'b', '(', '1/2', 'c', 'd', ')']],
        ['1/3 b ((3/4 c d e f) AND (g OR h))', null, ['1/3', 'b', '(', '(', '3/4', 'c', 'd', 'e', 'f', ')', 'AND', '(', 'g', 'OR', 'h', ')', ')']],
    ].forEach(executeSpec(tokenize));
});

describe('structuring', () => {
    [
        [['a', 'AND', 'b'], null, ['a', 'AND', 'b']],
        [['(', 'a', 'AND', 'b', ')'], null, [['a', 'AND', 'b']]],
        [['2/3', 'a', 'b', 'c'], null, ['2/3', 'X/Y', 'a', 'b', 'c']],
        [['(', '(', 'a', 'AND', 'b', ')', ')', 'OR', 'e'], null, [[['a', 'AND', 'b']], 'OR', 'e']],
        [['(', '(', 'a', 'AND', 'b', ')', 'OR', '(', 'c', 'AND', 'd', ')', ')', 'OR', 'e'], null, [[['a', 'AND', 'b'], 'OR', ['c', 'AND', 'd']], 'OR', 'e']],
        [['2/3', 'a', 'b', '(', '1/2', 'c', 'd', ')'], null, ['2/3', 'X/Y', 'a', 'b', ['1/2', 'X/Y', 'c', 'd']]],
        [['(', '2/3', 'a', 'b', 'c', ')', 'AND', '(', 'd', 'OR', 'e', ')'], null, [['2/3', 'X/Y', 'a', 'b', 'c'], 'AND', ['d', 'OR', 'e']]],
        [['2/3', 'a', 'b', '(', '1/2', 'c', 'd', ')', 'AND', '(', 'd', 'OR', 'e', ')'], null, ['2/3', 'X/Y', 'a', 'b', ['1/2', 'X/Y', 'c', 'd'], 'AND', ['d', 'OR', 'e']]],
        [['1/3', 'b', '(', '(', '3/4', 'c', 'd', 'e', 'f', ')', 'AND', '(', 'g', 'OR', 'h', ')', ')'], null, ['1/3', 'X/Y', 'b', [['3/4', 'X/Y', 'c', 'd', 'e', 'f'], 'AND', ['g', 'OR', 'h']]]],
    ].forEach(executeSpec(structure));
});

describe('evaluation', () => {
    [
        [[true, 'AND', true], null, true],
        [[false, 'AND', true], null, false],
        [[true, 'AND', false], null, false],
        [[false, 'AND', false], null, false],

        [[true, 'OR', true], null, true],
        [[false, 'OR', true], null, true],
        [[true, 'OR', false], null, true],
        [[false, 'OR', false], null, false],

        [['2/3', 'X/Y', true, true, true], null, true],
        [['2/3', 'X/Y', true, true, false], null, true],
        [['2/3', 'X/Y', true, false, false], null, false],
    ].forEach(executeSpec(evaluate));
});

describe('calculate expression result', () => {
    [
        ['', [], true],
        ['a', ['a'], true],
        ['a', ['b'], false],
        ['NOT a', ['a'], false],
        ['NOT a', ['b'], true],
        ['NOT a', [], true],
        ['NOT (a OR b)', ['a'], false],
        ['a AND NOT (b OR c)', ['a'], true],
        ['a AND NOT (b OR c)', ['a', 'b'], false],
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
        ['2/3 a (x OR y) c', ['a', 'x'], true],
        ['(2/3 a b c)', ['a'], false],
        ['2/3 a b ((3/4 c d e f) AND (g OR h))', ['a', 'c', 'd', 'e', 'g'], true],
        ['2/3 a b ((3/4 c d e f) AND (g OR h))', ['a', 'b', 'h'], true],
        ['2/3 a b ((3/4 c d e f) AND (g OR h))', ['a', 'c', 'd', 'f'], false],
        ['2/3 a b ((3/4 c d e f) AND (g OR h))', ['a', 'c', 'd', 'f', 'g'], true],
        ['2/3 a b ((3/4 c d e f) OR (g OR h))', ['a', 'c', 'g'], true],
        ['(2/3 a b c) AND (d OR e)', ['a'], false],
        ['(a AND b) OR (c AND d) OR (2/3 a b c)', ['b', 'c'], true],
    ].forEach(executeSpec(calculate));
});

describe('reduce to missing states', () => {
    [
        ['a OR b', ['a'], []],
        ['a OR b', ['b'], []],
        ['NOT a', ['a'], ['NOT', 'a']],
        ['NOT a', ['b'], []],
        ['NOT a', [], []],
        // not supported yet
        // ['NOT (a OR b)', ['a'], ['NOT', ['a', 'OR', 'b']]],
        // ['NOT (a AND b)', ['a'], ['NOT', ['b']]],
        ['a OR b', [], ['a', 'OR', 'b']],

        ['a OR b OR c', [], ['a', 'OR', ['b', 'OR', 'c']]],
        ['a OR b OR c', ['a'], []],
        ['a OR b OR c', ['b'], []],
        ['a OR b OR c', ['c'], []],

        ['a AND b', [], ['a', 'AND', 'b']],
        ['a AND b', ['a'], ['b']],
        ['a AND b', ['b'], ['a']],
        ['a AND b', ['a', 'b'], []],

        ['(a AND b) OR c', [], [['a', 'AND', 'b'], 'OR', 'c']],
        ['(a AND b) OR c', ['a', 'b'], []],
        ['(a AND b) OR c', ['a'], ['b', 'OR', 'c']],
        ['(a AND b) OR c', ['c'], []],
        ['(a AND b) OR c', ['a', 'c'], []],
        ['(a AND b) OR c', ['b', 'c'], []],

        ['a AND b OR c', ['a', 'c'], []],
        ['(a AND b) OR (c AND d)', ['a', 'c'], ['b', 'OR', 'd']],
        ['(a AND b) OR (c AND d) OR e', ['a', 'c'], ['b', 'OR', ['d', 'OR', 'e']]],
        ['(a AND b) OR (c AND d)', ['a', 'b'], []],

        ['2/3 a b c', ['a'], ['1/2', 'b', 'c']],
        ['2/3 a b c', ['a', 'b'], []],
        ['2/3 a b c', ['a', 'c'], []],
        ['2/3 a b c', ['b', 'c'], []],

        ['2/3 a (x OR y) c', ['a', 'x'], []],
        ['2/3 a (x OR y) c', ['a'], ['1/2', ['x', 'OR', 'y'], 'c']],

        ['3/3 a (x OR y) c', [], ['3/3', 'a', ['x', 'OR', 'y'], 'c']], 
        ['3/3 a (x OR y) c', ['a'], ['2/2', ['x', 'OR', 'y'], 'c']], 
        ['3/3 a (x OR y) c', ['a', 'c'], ['1/1', ['x', 'OR', 'y']]], // could be reduced to ['x', 'OR', 'y']

        ['2/3 a b ((3/4 c d e f) AND (g OR h))', ['a'], ['1/2', 'b', [['3/4', 'c', 'd', 'e', 'f'], 'AND', ['g', 'OR', 'h']]]],
        ['2/3 a b ((3/4 c d e f) AND (g OR h))', ['a', 'b'], []],
        ['2/3 a b ((3/4 c d e f) AND (g OR h))', ['a', 'c', 'd'], ['1/2', 'b', [['1/2', 'e', 'f'], 'AND', ['g', 'OR', 'h']]]],
        ['2/3 a b ((3/4 c d e f) AND (g OR h))', ['a', 'c', 'd', 'g'], ['1/2', 'b', ['1/2', 'e', 'f']]],
        ['2/3 a b ((3/4 c d e f) AND (g OR h))', ['a', 'c', 'd', 'f', 'g'], []],

        // same node in several places
        ['2/3 a a c', ['a'], []],
        ['a OR a OR a', ['a'], []],
        ['a AND a AND a', ['a'], []],
        ['2/3 a (x OR y) a', ['a'], []],
        ['2/3 a (x OR a) y', ['a'], []],
        ['2/3 a b ((3/4 a d e f) AND (a OR h))', ['a'], ['1/2', 'b', ['2/3', 'd', 'e', 'f']]],

    ].forEach(executeSpec(reduce));
});
