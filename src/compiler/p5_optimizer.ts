import { Operator } from "../language";
import { BinaryOperator, isBinaryOperator, isIdentifier, isNaryOperator, isOperator, isSyntaxParsingError, isUnaryOperator, OperatorNode, SyntaxNode, SyntaxParsingResult, UnaryOperator } from "./p2_syntaxAnalyzer";

// ID(a) => NOT(a)
// NOT(a) => ID(a)
// a => NOT(a)
const invertUnaryOperator = (input: SyntaxNode): UnaryOperator => {
    if (isUnaryOperator(input)) {
        return {
            ...input,
            operator: input.operator === Operator.id ? Operator.not : Operator.id,
        }
    }
    if (isIdentifier(input)) {
        return {
            operator: Operator.not,
            childs: [input],
        }
    }
}

// a AND b => a OR b
// a OR b => a AND b
const invertBinaryOperator = (input: SyntaxNode): BinaryOperator => {
    if (!isBinaryOperator(input)) {
        throw new Error("No binary operator");
    }
    return {
        ...input,
        operator: input.operator === Operator.and ? Operator.or : Operator.and,
    };
};

const __optimize = (input: SyntaxNode) : SyntaxNode => {
    if (!isOperator(input)) return input;

    if (isUnaryOperator(input)) {
        const operand = input.childs[0];
        // NOT (NOT a) => ID(a), ID(ID(a)) => ID(a)
        if (isUnaryOperator(operand) && input.operator === operand.operator) {
            return __optimize({
                operator: Operator.id,
                childs: operand.childs.map(__optimize),
            });
        }
        // ID (NOT a) => NOT(a), NOT(ID (a)) => NOT(a)
        if (isUnaryOperator(operand) && input.operator !== operand.operator) {
            return __optimize({
                operator: Operator.not,
                childs: operand.childs.map(__optimize),
            });
        }
    }

    if (isBinaryOperator(input)) {
        // a AND a => ID(a), a OR a => ID(a)
        if (input.childs.every(c => !isOperator(c)) && input.childs[0][1] === input.childs[1][1]) {
            return {
                operator: Operator.id,
                childs: [input.childs[0]].map(__optimize),
            }
        }
    }

    // NOT (a AND b) => NOT(a) OR NOT(b)
    // NOT (a OR b) => NOT(a) AND NOT(b)
    if (isUnaryOperator(input) && input.operator === Operator.not && isBinaryOperator(input.childs[0])) {
        const operand = input.childs[0];
        return __optimize({
            operator: invertBinaryOperator(operand).operator,
            childs: [
                __optimize({
                    operator: Operator.not,
                    childs: [operand.childs[0]],
                }),
                __optimize({
                    operator: Operator.not,
                    childs: [__optimize(operand.childs[1])],
                }),
            ]
        })
    }

    // 1/1 a => a
    if (isNaryOperator(input) && input.operatorParameter.x === 1 && input.operatorParameter.y === 1) {
        return __optimize(input.childs[0]);
    }

    return {
        ...input,
        childs: input.childs.map(__optimize),
    };
};

export const optimize = (input: SyntaxParsingResult): OperatorNode => {
    if (isSyntaxParsingError(input)) throw new Error('cannot-optimize-error');
    return __optimize(input) as OperatorNode;
}

export default {
    optimize,
};