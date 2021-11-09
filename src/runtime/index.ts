import { Operator } from "../language";
import { tokenize } from "../compiler/p1_lexicalAnalyzer";
import syntaxAnalyzer, { isIdentifier, OperatorNode, SymbolTable } from "../compiler/p2_syntaxAnalyzer"
import optimizer from "../compiler/p5_optimizer";
import { reduce } from "./reduce";

export type Result = boolean;
export type Expression = OperatorNode & {
    result?: Result;
};

export const isExpression = (x: any) : x is Expression => {
    return "result" in x;
}

const operatorFunctions = {
    [Operator.id]: (_, operands: [Result]): Result => {
        return !!operands[0];
    },
    [Operator.not]: (_, operands: [Result]): Result => {
        return !operands[0];
    },
    [Operator.and]: (_, operands: [Result, Result]): Result => {
        return operands[0] && operands[1];
    },
    [Operator.or]: (_, operands: [Result, Result]): Result => {
        return operands[0] || operands[1];
    },
    [Operator.xOfy]: (params, operands: Result[]): Result => {
        return operands.filter((x) => !!x).length >= params.x;
    },
};

const __run = (symbolTable: SymbolTable) => (expression: Expression) : Result => {
    if (expression === null) return true;
    if (isIdentifier(expression)) {
        const symbol = symbolTable[expression[1]];
        if (!symbol) throw new Error('identifier-not-found-in-symbol-table');
        return !!symbol.value;
    }

    const operatorFunction = operatorFunctions[expression.operator];
    if (!operatorFunction) throw new Error(" operator-function-not-found");

    expression.result = operatorFunction(expression.operatorParameter, expression.childs.map(__run(symbolTable)));
    return expression.result;
}

export const run = (expression: Expression) => (symbolTable: SymbolTable) => {
    return __run(symbolTable)(expression);
};

export const importTruthArrayToSymbolTable = (truthArray: string[], symbolTable: SymbolTable) : SymbolTable => {
    const truthifiedSymbolTable = { ... symbolTable };
    truthArray.forEach(truth => (truthifiedSymbolTable[truth] || {}).value = true);
    return truthifiedSymbolTable;
}

export const runWithTruthArray = (expression: string) => (state: string[]): boolean => {
    const tokens = tokenize(expression);
    const ast = optimizer.optimize(syntaxAnalyzer.parse(tokens));
    const symbolTable = syntaxAnalyzer.getSymbolTable(ast, {});
    const result = run(ast)(importTruthArrayToSymbolTable(state, symbolTable));
    return result;
};

export default {
    runWithTruthArray,
    run,
    reduce,
};
