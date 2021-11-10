import { identifyOperator, isParenthesis, isSeparator, Operator } from "../language";

export enum TokenType {
    operator = "operator",
    identifier = "identifier",
    separator = "separator",
    literal = "literal",
}

export type Token = [TokenType, string];

const identifyTokenType = (token: string): TokenType => {
    switch (token) {
        case '(':
        case ')':
            return TokenType.separator;
        default:
            return identifyOperator(token) !== Operator.unknown
                ? TokenType.operator
                : TokenType.identifier;
    }
}

const constructToken = (token: string): Token => [identifyTokenType(token), token];

const __tokenize = (tokens: Token[], currentIncompleteToken: string, remainingExpression: string): Token[] => {
    if (!remainingExpression || remainingExpression.length === 0) {
        if (currentIncompleteToken.length > 0) {
            const token = constructToken(currentIncompleteToken);
            tokens.push(token);
        }
        return tokens;
    }
    const currentChar = remainingExpression[0];

    if (isSeparator(currentChar)) {
        if (currentIncompleteToken.length > 0) {
            const token = constructToken(currentIncompleteToken);
            tokens.push(token);            
        }
        if (isParenthesis(currentChar)) {
            tokens.push(constructToken(currentChar));
        }
        return __tokenize(tokens, '', remainingExpression.slice(1));
    }

    return __tokenize(tokens, currentIncompleteToken.concat(currentChar), remainingExpression.slice(1));
};

export const tokenize = (str : string): Token[] => {
    return __tokenize([], '', str);
}

export const getAllIdentifiers = (expression: string): string[] => {
    const tokens = tokenize(expression);
    const nonDistinctIdentifiers = tokens.filter(t => t[0] === TokenType.identifier).map(t => t[1]);
    return nonDistinctIdentifiers.filter((val, i) => nonDistinctIdentifiers.indexOf(val) === i);
};

export default {
    tokenize,
    getAllIdentifiers,
};

