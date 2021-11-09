import { isOperator, OperatorNode, SyntaxNode } from "../compiler/p2_syntaxAnalyzer";
import { Operator } from "../language";

const stringificationFunctions = {
    [Operator.id]: (_, node: OperatorNode): string => {
        return node.childs ? node.childs[0][1] : "";
    },
    [Operator.not]: (_, node: OperatorNode): string => {
        return `NOT ${node.childs[0][1]}`;
    },
    [Operator.and]: (_, node: OperatorNode): string => {
        return `${__toStringNonRoot(node.childs[0])} AND ${__toStringNonRoot(
            node.childs[1]
        )}`;
    },
    [Operator.or]: (_, node: OperatorNode): string => {
        return `${__toStringNonRoot(node.childs[0])} OR ${__toStringNonRoot(
            node.childs[1]
        )}`;
    },
    [Operator.xOfy]: (params, node: OperatorNode): string => {
        return `${params.x}/${params.y} ${node.childs
            .map((c) => __toStringNonRoot(c))
            .reduce((agg, cur) => agg + " " + cur)}`;
    },
};

const __toString = (isRoot: boolean) => (ast: SyntaxNode): string => {
    if (!ast) return "";
    if (isOperator(ast)) {
        return `${!isRoot ? "(" : ""}${stringificationFunctions[ast.operator](
            ast.operatorParameter,
            ast
        )}${!isRoot ? ")" : ""}`;
    }
    return ast[1];
};

const __toStringNonRoot = __toString(false);

export default __toString(true);