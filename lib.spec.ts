/* eslint max-len: "off" */
import * as chai from 'chai';
import chaiExclude from 'chai-exclude';
import { pipe } from "./utils";
import lexicalAnalyzer, { Token, TokenType as TT } from './src/compiler/p1_lexicalAnalyzer';
import syntaxAnalyzer from './src/compiler/p2_syntaxAnalyzer';
import optimizer from './src/compiler/p5_optimizer';
import runtime from './src/runtime';
import { Operator as Op } from "./src/language";
import sourceGenerator from './src/sourceGenerator';
import boolExpressions from './index';

chai.use(chaiExclude);
const expect = chai.expect;

const execute = (...executionPipeline) => (testInput) => {
    const hasState = testInput.length > 2;
    const [expression, state, expectedResult] = hasState
        ? testInput
        : [testInput[0], null, testInput[1]];
    
    const spec = executionPipeline[executionPipeline.length - 1];
    it(`should ${spec.name} "${expression}" ${hasState ? `if ${state} `: ``} to be ${JSON.stringify(expectedResult, function (k, v) { return k && v && typeof v !== "number" ? (Array.isArray(v) ? "[object Array]" : "" + v) : v; })}`, () => {
        let result = pipe(...executionPipeline)(testInput[0]);
        if (hasState) result = result(state);
        if (result === null) {
            expect(result).to.deep.eq(expectedResult);
        }
        else if (typeof result === 'boolean' || typeof result === 'string') {
            expect(result).to.deep.eq(expectedResult);
        }
        else {
            expect(result).excludingEvery(['debug', 'parent']).to.deep.eq(expectedResult);
        }
    });
};

const identifiers = (...tokenStrings: string[]): Token[] => 
    tokenStrings.map(ts => lexicalAnalyzer.tokenize(ts)).reduce((p, cur) => [...p, ...cur]);

const tokenize = lexicalAnalyzer.tokenize;
const Trump = runtime.reduce;

describe('Phase 1: Lexical Analysis', () => {
    [
        ['', []],
        ['a', [[TT.identifier, 'a']]],
        ['NOT a', [[TT.operator, 'NOT'], [TT.identifier, 'a']]],
        ['a AND b', [[TT.identifier, 'a'], [TT.operator, 'AND'], [TT.identifier, 'b']]],
        ['   a  AND b    ', [[TT.identifier, 'a'], [TT.operator, 'AND'], [TT.identifier, 'b']]],
        ['(a AND b)', [[TT.separator, '('], [TT.identifier, 'a'], [TT.operator, 'AND'], [TT.identifier, 'b'], [TT.separator, ')']]],
        ['2/3 a b c', [[TT.operator, '2/3'], [TT.identifier, 'a'], [TT.identifier, 'b'], [TT.identifier, 'c']]],
        ['((a AND b) OR (c AND d)) OR e', [[TT.separator, '('], [TT.separator, '('], [TT.identifier, 'a'], [TT.operator, 'AND'], [TT.identifier, 'b'], [TT.separator, ')'], [TT.operator, 'OR'], [TT.separator, '('], [TT.identifier, 'c'], [TT.operator, 'AND'], [TT.identifier, 'd'], [TT.separator, ')'], [TT.separator, ')'], [TT.operator, 'OR'], [TT.identifier, 'e']]],
        ['2/3 a b (1/2 c d)', [[TT.operator, '2/3'], [TT.identifier, 'a'], [TT.identifier, 'b'], [TT.separator, '('], [TT.operator, '1/2'], [TT.identifier, 'c'], [TT.identifier, 'd'], [TT.separator, ')']]],
        ['1/3 b ((3/4 c d e f) AND (g OR h))', [[TT.operator, '1/3'], [TT.identifier, 'b'], [TT.separator, '('], [TT.separator, '('], [TT.operator, '3/4'], [TT.identifier, 'c'], [TT.identifier, 'd'], [TT.identifier, 'e'], [TT.identifier, 'f'], [TT.separator, ')'], [TT.operator, 'AND'], [TT.separator, '('], [TT.identifier, 'g'], [TT.operator, 'OR'], [TT.identifier, 'h'], [TT.separator, ')'], [TT.separator, ')']]],
    ].forEach(execute(lexicalAnalyzer.tokenize));
});

describe("Phase 1 - Get all identifiers", () => {
    [
        ["a OR b", ["a", "b"]],
        ["a OR b AND (b AND c)", ["a", "b", "c"]],
        ["2/3 a b (b AND c AND d)", ["a", "b", "c", "d"]],
        ["a", ["a"]],
        ["", []],
        [undefined, []],
        [null, []],
    ].forEach(execute(lexicalAnalyzer.getAllIdentifiers));
});

describe('Phase 2: Fill Symbol Table', () => {
    [
        ['', {}],
        ['a', { a: { value: undefined, name: 'a' }}],
        ['NOT a', { a: { value: undefined, name: 'a' }}],
        ['a AND b', { a: { value: undefined, name: 'a' }, b: { value: undefined, name: 'b' }}],
        ['   a  AND b    ', { a: { value: undefined, name: 'a' }, b: { value: undefined, name: 'b' }}],
        ['(a AND b)', { a: { value: undefined, name: 'a' }, b: { value: undefined, name: 'b' }}],
        ['2/3 a b c', { a: { value: undefined, name: 'a' }, b: { value: undefined, name: 'b' }, c: { value: undefined, name: 'c'}}],
    ].forEach(execute(tokenize, syntaxAnalyzer.parse, syntaxAnalyzer.getSymbolTable));
});

describe("Phase 2 - Syntax Validator", () => {
    [
        ["", true],
        ["a", true],
        ["a", true],
        ["NOT a", true],
        ["NOT a", true],
        ["NOT a", true],
        ["NOT (a OR b)", true],
        ["NOT (a AND b)", true],
        ["NOT ((a AND b) OR c)", true],
        ["a AND NOT (b OR c)", true],
        ["a AND NOT (b OR c)", true],
        ["a AND b", true],
        ["(a AND b)", true],
        ["a AND b", true],
        ["a AND b", true],
        ["(a AND b)", true],
        ["(a AND b) OR c", true],
        ["(a AND b) OR c", true],
        ["(a AND b) OR (c AND d)", true],
        ["(a AND b) OR (c AND d)", true],
        ["((a AND b) OR (c AND d)) OR e", true],
        ["2/3 a b c", true],
        ["2/3 a (x OR y) c", true],
        ["(2/3 a b c)", true],
        ["2/3 a b ((3/4 c d e f) AND (g OR h))", true],
        ["2/3 a b ((3/4 c d e f) AND (g OR h))", true],
        ["2/3 a b ((3/4 c d e f) AND (g OR h))", true],
        ["2/3 a b ((3/4 c d e f) AND (g OR h))", true],
        ["2/3 a b ((3/4 c d e f) OR (g OR h))", true],
        ["(2/3 a b c) AND (d OR e)", true],
        ["(a AND b) OR (c AND d) OR (2/3 a b c)", true],
        ["a OR", false],
        ["a b c", false],
        ["a AND", false],
        ["a AND b OR", false],
        ["2/3 a b", false],
        ["x/y a b", false],
        ["complete garbage", false],
        ["(a AND b) OR (c AND d", false],
        ["() AND () OR (())", false],
        ["AND", false],
    ].forEach(execute(lexicalAnalyzer.tokenize, syntaxAnalyzer.validate));
});

describe('Phase 2: Parser', () => {
    [
        ['', null],
        ['a', { operator: Op.id, childs: tokenize('a') }],
        ['(a)', { operator: Op.id, childs: [{operator: Op.id, childs: tokenize('a') }]}],
        ['NOT a', { operator: Op.not, childs: identifiers('a')}],
        ['ID a', {operator: Op.id, childs: identifiers('a')}],
        ['NOT (NOT a)', {operator: Op.not, childs: [{operator: Op.not, childs: identifiers('a')}]}],
        ['a AND b', { operator: Op.and, childs: identifiers('a', 'b')}],
        ['(a AND b)', { operator: Op.id, childs: [{ operator: Op.and, childs: identifiers('a', 'b')}]}],
        ['(a) AND (b)', { operator: Op.and, childs: [
            { operator: Op.id, childs: [...identifiers('a')]},
            { operator: Op.id, childs: [...identifiers('b')]},]}],
        ['NOT (a AND b)', { operator: Op.not, childs: [
            { operator: Op.and, childs: [
                ...identifiers('a', 'b')]}]}],
        ['(a AND b) OR c',  { operator: Op.or, childs: [
            { operator: Op.and, childs: identifiers('a', 'b')}, 
            ...identifiers('c')]}],
        ['(a AND b) OR (NOT c)',  { operator: Op.or, childs: [
            { operator: Op.and, childs: identifiers('a', 'b')}, 
            { operator: Op.not, childs: identifiers('c')}]}],
        ['a AND (b OR c)', { operator: Op.and, childs: [
            ...identifiers('a'),
            { operator: Op.or, childs: identifiers('b', 'c') }]}],
        ['(a AND b) OR (c AND d)',  { operator: Op.or, childs: [
            { operator: Op.and, childs: identifiers('a', 'b') }, 
            { operator: Op.and, childs: identifiers('c', 'd') },  ]}],
        ['2/3 a b c', { operator: Op.xOfy, operatorParameter: { x: 2, y: 3 }, childs: [
            ...identifiers('a', 'b', 'c')]}],
        ['2/3 a b (c AND d)', { operator: Op.xOfy, operatorParameter: { x: 2, y: 3 }, childs: [
            ...identifiers('a', 'b'),
            {  operator: Op.and, childs: [ ...identifiers('c', 'd') ] }, ]}],
        ['((a AND b) OR (c AND d)) OR e', { operator: Op.or, childs: [
            { operator: Op.or, childs: [                    
                { operator: Op.and, childs: [
                    ...identifiers('a', 'b')]},
                { operator: Op.and, childs: [
                    ...identifiers('c', 'd')]}]},
            ...identifiers('e'),]}],
        ['2/3 a b (1/2 c d)', { operator: Op.xOfy, operatorParameter: { x: 2, y: 3 }, childs: [
            ...identifiers('a', 'b'),
            { operator: Op.xOfy, operatorParameter: { x: 1, y: 2 }, childs: [
                ...identifiers('c', 'd')]}]}],
        ['1/3 b ((3/4 c d e f) AND (g OR h))', { operator: Op.xOfy, operatorParameter: { x: 1, y: 3 }, childs: [
                ...identifiers('b'),
                { operator: Op.and, childs: [
                    { operator: Op.xOfy, operatorParameter: { x: 3, y: 4 }, childs: 
                        identifiers('c', 'd', 'e', 'f')},
                    { operator: Op.or, childs: 
                        identifiers('g', 'h')}]}]}],
        ["a AND NOT b", { operator: Op.and, childs: [
            ...identifiers('a'),
            { operator: Op.not, childs: [
                ...identifiers('b')]}
        ]}],
        // Legacy Compatibility
        ["a AND NOT (b OR c)", { operator: Op.and, childs: [
            ...identifiers('a'),
            { operator: Op.not, childs: [
                { operator: Op.or, childs: [
                    ...identifiers('b', 'c')
                ]}]}]}],
        ["a OR NOT (b OR NOT c)", { operator: Op.or, childs: [
            ...identifiers('a'),
            { operator: Op.not, childs: [
                { operator: Op.or, childs: [
                    ...identifiers('b'),
                    { operator: Op.not, childs: [
                        ...identifiers('c'),]}]}]}]}],
        ['a OR b OR c', { operator: Op.or, childs: [
            { operator: Op.or, childs: [
                ...identifiers('a', 'b'),]},
            ...identifiers('c'),            
        ]}],
        ['a AND b AND c', { operator: Op.and, childs: [
            { operator: Op.and, childs: [
                ...identifiers('a', 'b'),]},
            ...identifiers('c'),            
        ]}],
        // Highly questionable logic, legacy compatibility
        ['a AND b OR c', { operator: Op.or, childs: [
            { operator: Op.and, childs: [
                ...identifiers('a', 'b'),]},
            ...identifiers('c'),]}],
    ].forEach(execute(tokenize, syntaxAnalyzer.parse));
})

describe('Phase 5: Optimization', () => {
    [
        // // Unnecessary nesting
        ['(a)', {operator: Op.id, childs: tokenize('a') }],
        ['((a))', {operator: Op.id, childs: tokenize('a') }],
        //['(a) AND (b)', { operator: Op.and, childs: identifiers('a', 'b') }],
        // Double Negation
        ['NOT (NOT a)', { operator: Op.id, childs: identifiers('a') }],
        ['NOT (NOT (NOT a)', { operator: Op.not, childs: identifiers('a') }],
        ['NOT (NOT (NOT (NOT a)', { operator: Op.id, childs: identifiers('a') }],
        // Idempotency Law
        ['a AND a', { operator: Op.id, childs: identifiers('a') }],
        ['a OR a', { operator: Op.id, childs: identifiers('a') }],
        // De'Morgan Law
        ['NOT (a AND b)', { operator: Op.or, childs: [
            { operator: Op.not, childs: identifiers('a') },
            { operator: Op.not, childs: identifiers('b') }, ]
        }],
        ['NOT ((a AND b))', { operator: Op.or, childs: [
            { operator: Op.not, childs: identifiers('a') },
            { operator: Op.not, childs: identifiers('b') }, ]
        }],
        ['NOT (a OR b)', { operator: Op.and, childs: [
            { operator: Op.not, childs: identifiers('a') },
            { operator: Op.not, childs: identifiers('b') }, ]
        }],
        ['NOT ((a AND b) OR c)', 
            { operator: Op.and, childs: [  // ((NOT a) OR (NOT b)) AND (NOT c)
                { operator: Op.or, childs: [ 
                    { operator: Op.not, childs: identifiers('a') },
                    { operator: Op.not, childs: identifiers('b') },
                ]},
                { operator: Op.not, childs: identifiers('c') }, ]
            }],

    ].forEach(execute(tokenize, syntaxAnalyzer.parse, optimizer.optimize));
});

describe('Phase 5 - optimize all true expressions away', () => {
    [
        ["", [], ""],
        ["", ["a"], ""],
        ["a", ["a"], ""],
        ["a", [], "a"],
        ["a", ["a", "b"], ""],
        ["a OR b", ["a"], ""],
        ["a OR b", ["b"], ""],
        ["a OR b", [], "a OR b"],
        ["NOT a", ["a"], "NOT a"],
        ["NOT a", ["b"], ""],
        ["NOT a", [], ""],
        ["NOT (a OR b)", ["a"], "NOT a"],
        ["NOT (a AND b)", ["a"], ""],
        ["NOT ((a AND b) OR c)", ["a", "b"], "(NOT a) OR (NOT b)"],
        ["NOT (a AND b)", ["a", "b"], "(NOT a) OR (NOT b)"],
        ["a OR b", [], "a OR b"],

        ["a OR b OR c", [], "(a OR b) OR c"],
        ["a OR b OR c", ["a"], ""],
        ["a OR b OR c", ["b"], ""],
        ["a OR b OR c", ["c"], ""],

        ["a AND b", [], "a AND b"],
        ["a AND b", ["a"], "b"],
        ["a AND b", ["b"], "a"],
        ["a AND b", ["a", "b"], ""],

        ["(a AND b) OR c", [], "(a AND b) OR c"],
        ["(a AND b) OR c", ["a", "b"], ""],
        ["(a AND b) OR c", ["a"], "b OR c"],
        ["(a AND b) OR c", ["c"], ""],
        ["(a AND b) OR c", ["a", "c"], ""],
        ["(a AND b) OR c", ["b", "c"], ""],

        ["a AND b OR c", ["a", "c"], ""],
        ["(a AND b) OR (c AND d)", ["a", "c"], "b OR d"],
        ["(a AND b) OR (c AND d) OR e", ["a", "c"], "(b OR d) OR e"],
        ["(a AND b) OR (c AND d)", ["a", "b"], ""],

        ["2/3 a b c", ["a"], "1/2 b c"],
        ["2/3 a b c", ["a", "b"], ""],
        ["2/3 a b c", ["a", "c"], ""],
        ["2/3 a b c", ["b", "c"], ""],

        ["2/3 a (x OR y) c", ["a", "x"], ""],
        ["2/3 a (x OR y) c", ["a"], "1/2 (x OR y) c"],

        ["3/3 a b c", ["a", "b"], "c"],
        ["3/3 a (x OR y) c", [], "3/3 a (x OR y) c"],
        ["3/3 a (x OR y) c", ["a"], "2/2 (x OR y) c"],
        ["3/3 a (x OR y) c", ["a", "c"], "x OR y"],

        [
            "2/3 a b ((3/4 c d e f) AND (g OR h))",
            ["a"],
            "1/2 b ((3/4 c d e f) AND (g OR h))",
        ],
        ["2/3 a b ((3/4 c d e f) AND (g OR h))", ["a", "b"], ""],
        [
            "2/3 a b ((3/4 c d e f) AND (g OR h))",
            ["a", "c", "d"],
            "1/2 b ((1/2 e f) AND (g OR h))",
        ],
        [
            "2/3 a b ((3/4 c d e f) AND (g OR h))",
            ["a", "c", "d", "g"],
            "1/2 b (1/2 e f)",
        ],
        ["2/3 a b ((3/4 c d e f) AND (g OR h))", ["a", "c", "d", "f", "g"], ""],

        // same node in several places
        ["2/3 a a c", ["a"], ""],
        ["2/3 a x y", ["a"], "1/2 x y"],
        ["2/3 x a y", ["a"], "1/2 x y"],
        ["2/3 x y a", ["a"], "1/2 x y"],
        ["(c AND d) OR (2/3 x y a)", ["c", "a"], "d OR (1/2 x y)"],
        ["a OR a OR a", ["a"], ""],
        ["a AND a AND a", ["a"], ""],
        ["2/3 a (x OR y) a", ["a"], ""],
        ["2/3 a (x OR a) y", ["a"], ""],
        ["2/3 a b ((3/4 a d e f) AND (a OR h))", ["a"], "1/2 b (2/3 d e f)"],
    ].forEach(execute(boolExpressions.reduce));
});


describe('Runtime - with symbol table input', () => {
    [
        ["a", { a: { value: true } }, true],
        ["a", { a: { value: false } }, false],
        ["NOT a", { a: { value: true } }, false],
        ["NOT a", { a: { value: false } }, true],
        ["a AND b", { a: { value: true }, b: { value: false } }, false],
        ["a AND b", { a: { value: false }, b: { value: true } }, false],
        ["a AND b", { a: { value: true }, b: { value: true } }, true],
        ["a AND b", { a: { value: false }, b: { value: false } }, false],
        ["a AND b", { a: { value: true }, b: { value: undefined } }, false],
        ["a OR b", { a: { value: true }, b: { value: false } }, true],
        ["a OR b", { a: { value: false }, b: { value: true } }, true],
        ["a OR b", { a: { value: true }, b: { value: true } }, true],
        ["a OR b", { a: { value: false }, b: { value: false } }, false],
        ["NOT (a OR b)", { a: { value: true }, b: { value: false } }, false],
        ["a AND (b OR c)", { a: { value: true }, b: { value: true }, c : { value: false} }, true],
        ['2/3 a b c', { a: { value: true }, b: { value: true }, c : { value: true} }, true],
        ['2/3 a b c', { a: { value: true }, b: { value: true }, c : { value: false} }, true],
        ['2/3 a b c', { a: { value: true }, b: { value: false }, c : { value: false} }, false],
        ['2/3 a b c', { a: { value: false }, b: { value: false }, c : { value: false} }, false],
        ['2/3 a b (c OR d)', { a: { value: false }, b: { value: true }, c : { value: false}, d: { value: true} }, true],
    ].forEach(execute(tokenize, syntaxAnalyzer.parse, optimizer.optimize, runtime.run));
});

describe("Runtime - with truth array input", () => {
    [
        ["", [], true],
        ["a", ["a"], true],
        ["a", ["b"], false],
        ["NOT a", ["a"], false],
        ["NOT a", ["b"], true],
        ["NOT a", [], true],
        ["NOT (a OR b)", ["a"], false],
        ["NOT (a AND b)", ["a"], true],
        ["NOT ((a AND b) OR c)", ["a", "b"], false],
        ["a AND NOT (b OR c)", ["a"], true],
        ["a AND NOT (b OR c)", ["a", "b"], false],
        ["a AND b", ["a"], false],
        ["(a AND b)", ["a"], false],
        ["a AND b", ["b"], false],
        ["a AND b", ["a", "b"], true],
        ["(a AND b)", ["a", "b"], true],
        ["(a AND b) OR c", ["c"], true],
        ["(a AND b) OR c", ["a", "b"], true],
        ["(a AND b) OR (c AND d)", ["a", "c"], false],
        ["(a AND b) OR (c AND d)", ["a", "b"], true],
        ["((a AND b) OR (c AND d)) OR e", ["e"], true],
        ["2/3 a b c", ["a", "b"], true],
        ["2/3 a b c", ["a"], false],
        ["2/3 a x y", ["a"], false],
        ["2/3 x a y", ["a"], false],
        ["2/3 x y a", ["a"], false],
        ["(c AND d) OR (2/3 x y a)", ["y"], false],
        [
            "(RKARR1 AND GKBRSTART1) OR (2/3 GKBRFORT GKBREND JVPST02)",
            ["GKBREND"],
            false,
        ],
        ["2/3 a (x OR y) c", ["a", "x"], true],
        ["(2/3 a b c)", ["a"], false],
        [
            "2/3 a b ((3/4 c d e f) AND (g OR h))",
            ["a", "c", "d", "e", "g"],
            true,
        ],
        ["2/3 a b ((3/4 c d e f) AND (g OR h))", ["a", "b", "h"], true],
        ["2/3 a b ((3/4 c d e f) AND (g OR h))", ["a", "c", "d", "f"], false],
        [
            "2/3 a b ((3/4 c d e f) AND (g OR h))",
            ["a", "c", "d", "f", "g"],
            true,
        ],
        ["2/3 a b ((3/4 c d e f) OR (g OR h))", ["a", "c", "g"], true],
        ["(2/3 a b c) AND (d OR e)", ["a"], false],
        ["(a AND b) OR ((c AND d) OR (2/3 a b c))", ["b", "c"], true],
    ].forEach(execute(runtime.runWithTruthArray));
});


describe('Source Generator', () => {
    [
        ["", ""],
        ["a", "a"],
        ["a AND b", "a AND b"],
        ["a OR (b AND (b AND c))", "a OR (b AND (b AND c))"],
        ["2/3 a b c", "2/3 a b c"],
        ["2/3 a b (c OR d)", "2/3 a b (c OR d)"],
        ["2/3 a b ((3/4 c d e f) OR (g OR h))", '2/3 a b ((3/4 c d e f) OR (g OR h))'],
        ['a AND b AND c', '(a AND b) AND c'],
        ['NOT a', 'NOT a'],
        ['NOT (a AND b)', '(NOT a) OR (NOT b)']
    ].forEach(execute(tokenize, syntaxAnalyzer.parse, optimizer.optimize, sourceGenerator));
})
