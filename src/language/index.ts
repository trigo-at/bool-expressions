type Whitespace = " ";
type Parenthesis = "(" | ")";
type Separator = Whitespace | Parenthesis;
enum BooleanOperator {
    and = "AND",
    or = "OR",
    not = "NOT",
    id = "ID",
}
enum AdvancedOperator {
    xOfy = "X/Y",
    unknown = "UNKNOWN",
}
export const Operator = { ...BooleanOperator, ...AdvancedOperator };
export type Operator = BooleanOperator | AdvancedOperator;

export const isWhitespace = (char: string): char is Whitespace => char === " ";
export const isParenthesis = (char: string): char is Parenthesis => char === "(" || char === ")";
export const isSeparator = (char: string): char is Separator => isWhitespace(char) || isParenthesis(char);

const isBooleanOperator = (token: string): token is Operator => Object.values(BooleanOperator).some((o) => o === token);

const advancedOperators = new Map([
    [Operator.xOfy, (token) => token.match(/^\d\/\d$/)],
]);

const identifyAdvancedOperator = (token: string): Operator => {
    for (let [
        operatorType,
        operatorDefinition,
    ] of advancedOperators.entries()) {
        const opDef = operatorDefinition(token);
        if (opDef) return operatorType;
    }
    return Operator.unknown;
};

export const identifyOperator = (token: string): Operator => {
    return isBooleanOperator(token)
        ? <Operator>token
        : identifyAdvancedOperator(token);
};
