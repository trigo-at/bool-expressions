const isWhitespace = (char: string): boolean => char === ' ';
const isBraces = (char: string): boolean => char === '(' || char === ')';
const isSeparator = (char: string): boolean => isWhitespace(char) || isBraces(char);

const __tokenize = (result: string[], current: string, str: string): string[] => {
    if (!str || str.length === 0) {
        if (current.length > 0) result.push(current);
        return result;
    }
    const currentChar = str[0];

    if (isSeparator(currentChar)) {
        if (current.length > 0) result.push(current);
        if (isBraces(currentChar)) result.push(currentChar);
        return __tokenize(result, '', str.slice(1));
    }

    return __tokenize(result, current.concat(currentChar), str.slice(1));
};

/** Transforms an expression string into a flat token array
 * @param {string} str - expression string
 * @returns {string[]} tokenized string
 */
const tokenize = (str : string): string[] => __tokenize([], '', str);

export default tokenize;