import { Operator } from "../language";
import { tokenize } from "../compiler/p1_lexicalAnalyzer";
import syntaxAnalyzer, { isBinaryOperator, isIdentifier, isNaryOperator, SymbolTable, SyntaxNode } from "../compiler/p2_syntaxAnalyzer";
import { optimize } from "../compiler/p5_optimizer";
import { Expression, importTruthArrayToSymbolTable, isExpression, run } from ".";
import toString from '../sourceGenerator';

const getNodeValue = (symbolTable: SymbolTable, node: SyntaxNode) => {
    if (!node) return true;
    if (isIdentifier(node)) {
        const symbol = symbolTable[node[1]];
        if (!symbol) throw new Error("identifier-not-found-in-symbol-table");
        return !!symbol.value;
    }
    return (node as Expression).result;
}

const reduceFunctions = {
    [Operator.id]: (symbolTable: SymbolTable) => (_, operands: [SyntaxNode]): SyntaxNode[] => {
        return getNodeValue(symbolTable, operands[0]) ? [] : operands;
    },
    [Operator.not]: (symbolTable: SymbolTable) => (_, operands: [SyntaxNode]): SyntaxNode[] => {
        return getNodeValue(symbolTable, operands[0]) ? operands : [];
    },
    [Operator.and]: (symbolTable: SymbolTable) => (_, operands: [SyntaxNode, SyntaxNode]): SyntaxNode[] => {
        const d = operands.map(x => __reduce(symbolTable)(x))
        return d.filter(x => !getNodeValue(symbolTable, x));
    },
    [Operator.or]: (symbolTable: SymbolTable) => (_, operands: [SyntaxNode, SyntaxNode]): SyntaxNode[] => {
        const d = operands.map(x => __reduce(symbolTable)(x))
        return d.filter((x) => !getNodeValue(symbolTable, x)).length > 0 ? d : [];
    },
    [Operator.xOfy]: (symbolTable: SymbolTable) => (params, operands: SyntaxNode[]): SyntaxNode[] => {
        const d = operands.map((x) => __reduce(symbolTable)(x));
        return d.filter((x) => !getNodeValue(symbolTable, x));
    },
};

const __reduce = (symbolTable: SymbolTable) => (expression: SyntaxNode): SyntaxNode => {
    if (expression === null) return null;
    if (isIdentifier(expression)) {
        return getNodeValue(symbolTable, expression) ? null : expression;
    }
    if (isExpression(expression) && expression.result) return null;
    
    
    const reduceFunction = reduceFunctions[expression.operator];
    if (!reduceFunction) throw new Error(" operator-function-not-found");

    const childs = reduceFunction(symbolTable)(expression.operatorParameter, expression.childs)
    if (childs && childs.length === 1 && isBinaryOperator(expression)) {
        // only 1 of the 2 childs of a binary operator is false, so the operator is dismissed and only the operand stays
        return childs[0];
    }
    if (isNaryOperator(expression)) {
        const diff = expression.childs.length - childs.length;
        return {
            ...expression,
            operatorParameter: { x: expression.operatorParameter.x - diff, y: expression.operatorParameter.y - diff},
            childs,
        }
    }
    const result = {
        ...(expression as Expression),
        childs,
    };
    return result;
}

export const reduce = (expression: string) => (state: string[]): string => {
    const tokens = tokenize(expression);
    const ast = optimize(syntaxAnalyzer.parse(tokens));
    const symbolTable = syntaxAnalyzer.getSymbolTable(ast, {});
    const symbolTableWithValues = importTruthArrayToSymbolTable(state, symbolTable);

    run(ast)(importTruthArrayToSymbolTable(state, symbolTable));

    const result = optimize(__reduce(symbolTableWithValues)(ast));

    const str =  toString(result);
    return str;
}
