import { flatten } from '../../utils';
import { operatorSymbols, isXofYexpression } from '../language';

const __structure = (result: string[], tokens: string[]) => {
    // once we are at the end of the token array or encounter a closing brace -> cut off
    if (tokens.length === 0 || tokens[0] === ')') {
        return result;
    }
    const currentToken = tokens[0];
    
    // if we encounter an opening brace, we open a new recursion to get nesting
    if (currentToken === '(') {
        const nestedStruct = __structure([], tokens.slice(1));
        result.push(nestedStruct);
        const flatResult = flatten(nestedStruct);
        // we have to slice off the number of processed tokens + 2 braces per depth level
        // X/Y have to be filtered out because we add them to the expression
        const numAlreadyProcessedTokens =
            flatResult.result.filter(x => x !== operatorSymbols.xOfy && x !== '_').length + (flatResult.allArrays.length * 2);
        return __structure(result, tokens.slice(numAlreadyProcessedTokens));
    }

    if (currentToken === operatorSymbols.not) {
        result.push('_');
    }
    result.push(currentToken);

    // insert "x/y" token into structure so that every operator follows
    // the <operand 1> <operator> <operand2> notation
    if (isXofYexpression(currentToken)) {
        result.push(operatorSymbols.xOfy);
    }
    return __structure(result, tokens.slice(1));
};

/**
 * Transform a token array into a nested structure, based on bracing
 * @param {string[]} tokens - the flat token array
 * @returns {string[]} a nested token array, braces removed
 */
const structure = (tokens: string[]): string[] => __structure([], tokens);

export default structure;