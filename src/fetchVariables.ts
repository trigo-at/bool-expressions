import { pipe } from '../utils';
import { isReserved } from './language';
import tokenize from './compiler/tokenize';

const filterReservedSymbols = (tokenArray: string[]): string[] => {
    return tokenArray.filter(token => !isReserved(token));
};

const deduplicate = (array: string[]): string[] => {
    return array.filter((token, pos) => array.indexOf(token) === pos);
};

const fetchVariables = (expression: string) : string[] => {
    return pipe(
        tokenize,
        filterReservedSymbols,
        deduplicate,
    )(expression);
};

export default fetchVariables;