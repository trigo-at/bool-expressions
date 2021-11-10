import lexicalAnalyzer from "./src/compiler/p1_lexicalAnalyzer";
import syntaxAnalyzer from './src/compiler/p2_syntaxAnalyzer';
import runtime from "./src/runtime";
import { pipe } from "./utils";

export default { 
    
    reduce: runtime.reduce,
    
    calculate: runtime.runWithTruthArray,
    
    fetchVariables: lexicalAnalyzer.getAllIdentifiers,
    
    // legacy support for untokenized string inputs
    validate: (input: string): boolean => pipe(lexicalAnalyzer.tokenize(input), syntaxAnalyzer.validate)(input)
    
};