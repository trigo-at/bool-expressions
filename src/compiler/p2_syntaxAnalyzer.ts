import { identifyOperator, isSeparator, Operator } from '../language';
import { Token, TokenType } from './p1_lexicalAnalyzer';

export enum ParenthesisType {
    open = "open",
    close = "close",
    none = "none",
}
export interface OperatorNodeBase {
    operator: Operator,
    operatorParameter?: any,
    parent?: OperatorNode,
    debug?: any,
};

export type IdentifierNode = Token;

export type UnaryOperator = OperatorNodeBase & {
    childs: [SyntaxNode];
};
export type BinaryOperator = OperatorNodeBase & {
    childs: [SyntaxNode, SyntaxNode];
};
export type NaryOperator = OperatorNodeBase & {
    childs: SyntaxNode[];
};
export type OperatorNode = UnaryOperator | BinaryOperator | NaryOperator;

export type SyntaxNode = OperatorNode | IdentifierNode;

export type SyntaxParsingError = "operator-missing" | "brace-mismatch";

export interface SyntaxError {
    error: SyntaxParsingError,
};

export const isSyntaxParsingError = (ast: SyntaxParsingResult): ast is SyntaxError  => {
    return ast !== null && "error" in ast;
}

export type SyntaxParsingResult = SyntaxNode | SyntaxError;

export const isOperator = (input: SyntaxNode): input is OperatorNode => {
    return !!input && "operator" in input;
};

export const isIdentifier = (input: SyntaxNode): input is IdentifierNode => {
    return !isOperator(input);
};

export const isUnaryOperator = (input: SyntaxNode): input is UnaryOperator => {
    return (
        isOperator(input) &&
        (input.operator === Operator.id || input.operator === Operator.not)
    );
};

export const isBinaryOperator = (input: SyntaxNode): input is BinaryOperator => {
    return (
        isOperator(input) &&
        (input.operator === Operator.and || input.operator === Operator.or)
    );
};

export const isNaryOperator = (input: SyntaxNode): input is NaryOperator => {
    return isOperator(input) && input.operator === Operator.xOfy;
};

export type SymbolTable = object;

const registerIdentifier = (token: Token, symbolTable: object) : void => {
    if (!token) return;
    const identifier = token[1];
    if (isIdentifier(token) && !symbolTable[identifier]) {
        symbolTable[identifier] = { value: undefined, name: identifier };
    }
}

const getSymbolTable = (ast: SyntaxNode, symbolTable: SymbolTable) : SymbolTable => {
    symbolTable = symbolTable || { };
    if (isIdentifier(ast)) {
        registerIdentifier(ast, symbolTable);
    }
    else {
        ast.childs.forEach((c) => getSymbolTable(c, symbolTable));
    }
    return symbolTable;
}

const isParenthesis = (token: Token) =>
    isSeparator(token[1]) && token[1] === "("
        ? ParenthesisType.open
        : token[1] === ")"
        ? ParenthesisType.close
        : ParenthesisType.none;

const createNode = (parent: OperatorNode, level: number): OperatorNode => ({
    operator: Operator.unknown,
    childs: [],
    parent: parent,
    debug: {
        level,
    },
});

const __parse = (tokens: Token[], currentNode: OperatorNode, tree: OperatorNode): OperatorNode => {
    // console.log("▶", { currentNode, tokens });
    const [nextToken, tokenAfterTheNext] = tokens;
    
    if (!nextToken) {
        // console.log("🛑", { currentNode });
        if (currentNode && isOperator(currentNode) && currentNode.operator === Operator.unknown) 
            currentNode.operator = Operator.id;
        return tree;
    }

    if (isParenthesis(nextToken) === ParenthesisType.close && isOperator(currentNode)) {
        // console.log("⬆⬆⬆⬆⬆⬆ UP ⬆⬆⬆⬆⬆⬆", {currentNode});
        if (currentNode.childs.length === 1 && isIdentifier(currentNode.childs[0]) && currentNode.operator === Operator.unknown) {
            // "(a)"
            currentNode.parent.childs.concat(currentNode.childs);
        }
        if (currentNode && isOperator(currentNode) && currentNode.operator === Operator.unknown) {
            // necessary since we partially skip currentNode processing because of .parent passing
            currentNode.operator = Operator.id;
        }
        return __parse(tokens.slice(1), currentNode.parent, tree);
    }
    if (isParenthesis(nextToken) === ParenthesisType.open) {
        // console.log("⬇⬇⬇⬇⬇⬇ DOWN ⬇⬇⬇⬇⬇⬇");
        const nextLevel = createNode(currentNode, currentNode.debug.level + 1);
        currentNode.childs.push(nextLevel);
        return __parse(tokens.slice(1), nextLevel, tree);
    }
    if (isBinaryOperator(currentNode) && identifyOperator(nextToken[1]) === Operator.not) {
        // AND NOT, OR NOT (without parenthesis)
        const nextLevel = createNode(currentNode, currentNode.debug.level + 1);
        nextLevel.operator = Operator.not;
        currentNode.childs.push(nextLevel);
        return __parse(tokens.slice(1), nextLevel, tree);
    }
    
    // console.log("🔄", { currentNode, tokens });
    if (nextToken[0] === TokenType.identifier) {
        currentNode.childs.push(nextToken);
    }
    if (nextToken[0] === TokenType.operator) {
        if (currentNode.operator !== Operator.unknown) {
            // Legacy Compatibility for "x AND y AND y" and such
            const lower = createNode(currentNode, currentNode.debug.level + 1);
            lower.operator = currentNode.operator
            lower.childs = currentNode.childs;
            
            currentNode.childs = [lower];
            currentNode.operator = identifyOperator(nextToken[1]);
            
            //return pass1(tokens.slice(1), currentNode, tree);
        }
        else {
            currentNode.operator = identifyOperator(nextToken[1]);
            if (currentNode.operator === Operator.xOfy) {
                currentNode.operatorParameter = {
                    x: Number.parseInt(nextToken[1].match(/^(\d)\/(\d)$/)[1]),
                    y: Number.parseInt(nextToken[1].match(/^(\d)\/(\d)$/)[2]),
                };
            }
        }
    }
    return __parse(tokens.slice(1), currentNode, tree); 
}

/**
 * Transform a token array into a syntax tree
 * @param {string[]} tokens - the flat token array
 * @returns {string[]} a nested token array, braces removed
 */
const parse = (tokens: Token[]): SyntaxParsingResult => {
    const root = createNode(null, 0);
    try { 
        const result = __parse(tokens, root, root);
        return result.childs.length === 0 ? null : result;
    }
    catch (e) {
        return { error: e.message };
    }
}

const __validate = (ast: SyntaxNode) : boolean => {
    if (isIdentifier(ast)) {
        return true;
    }
    if (isUnaryOperator(ast)) {
        return ast.childs && ast.childs.length === 1 && ast.childs.every(__validate);
    }
    if (isBinaryOperator(ast)) {
        return ast.childs && ast.childs.length === 2  && ast.childs.every(__validate);
    }
    if (isNaryOperator(ast)) {
        return ast.childs && 
            ast.childs.length > 0 && 
            ast.childs.every(__validate) && 
            !!ast.operatorParameter.x && !!ast.operatorParameter.y &&
            ast.childs.length === ast.operatorParameter.y &&
            ast.operatorParameter.y >= ast.operatorParameter.x;
    }
    return true;
}

export const validate = (tokens: Token[]) : boolean => {
    try {
        if (tokens.length === 0) return true;
        if (tokens.filter(t => isParenthesis(t) === ParenthesisType.open).length !== tokens.filter(t => isParenthesis(t) === ParenthesisType.close).length) return false;
        const ast = parse(tokens);
        if (ast === null || isSyntaxParsingError(ast)) return false;
        return __validate(ast);
    }
    catch (e) {
        return false;
    }
}

export default {
    parse,
    getSymbolTable,
    validate,
};