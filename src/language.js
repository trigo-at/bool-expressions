"use strict";
exports.__esModule = true;
var utils_1 = require("../utils");
function isOperand(obj) {
    return obj.operand !== undefined;
}
exports.isOperand = isOperand;
exports.operatorSymbols = {
    and: 'AND',
    or: 'OR',
    xOfy: 'X/Y',
    not: 'NOT'
};
exports.xOfyPattern = new RegExp('([0-9]+)/([0-9]+)');
exports.reservedSymbols = Object.values(exports.operatorSymbols).concat([
    exports.xOfyPattern,
    '\\(',
    '\\)',
]);
exports.isReserved = function (token) { return (typeof token === 'string' && !!exports.reservedSymbols.find(function (symbol) { return !!token.match(symbol); })); };
exports.isXofYexpression = utils_1.matches(exports.xOfyPattern);
