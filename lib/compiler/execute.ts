import { OperatorMap, operatorSymbols } from '../language';

const execute = (operators: OperatorMap) => function __internalEvaluate(structuredExpression) {
    // if the expression consists of only a value, we return it immediately
    if (!Array.isArray(structuredExpression)) return structuredExpression;
    if (structuredExpression.length === 0) return true;

    const [leftOperand, operator, ...rightOperand] = structuredExpression;
    if (structuredExpression.length === 1) {
        return Array.isArray(leftOperand) ? __internalEvaluate(leftOperand) : leftOperand;
    }

    // the x/y operator is special in that the left operand is not really an operand
    // and the right operand is not to be continued with folding because
    // the remaining list belongs to the x/y operation
    if (!operators[operator]) throw new Error(`Operator ${operator} not supported`);
    return operator === operatorSymbols.xOfy ?
        operators[operator](leftOperand)(rightOperand.map(__internalEvaluate)) :
        operators[operator](__internalEvaluate([leftOperand]))(__internalEvaluate(rightOperand));
};

export default execute;