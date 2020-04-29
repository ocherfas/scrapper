"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fixInstallments = fixInstallments;
exports.sortTransactionsByDate = sortTransactionsByDate;
exports.filterOldTransactions = filterOldTransactions;

var _moment = _interopRequireDefault(require("moment"));

var _lodash = _interopRequireDefault(require("lodash"));

var _constants = require("../constants");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function isNormalTransaction(txn) {
  return txn.type === _constants.NORMAL_TXN_TYPE;
}

function isInstallmentTransaction(txn) {
  return txn.type === _constants.INSTALLMENTS_TXN_TYPE;
}

function isNonInitialInstallmentTransaction(txn) {
  return isInstallmentTransaction(txn) && txn.installments && txn.installments.number > 1;
}

function isInitialInstallmentTransaction(txn) {
  return isInstallmentTransaction(txn) && txn.installments && txn.installments.number === 1;
}

function fixInstallments(txns) {
  return txns.map(txn => {
    const clonedTxn = _objectSpread({}, txn);

    if (isNonInitialInstallmentTransaction(clonedTxn)) {
      const dateMoment = (0, _moment.default)(clonedTxn.date);
      const actualDateMoment = dateMoment.add(clonedTxn.installments.number - 1, 'month');
      clonedTxn.date = actualDateMoment.toISOString();
    }

    return clonedTxn;
  });
}

function sortTransactionsByDate(txns) {
  return _lodash.default.sortBy(txns, ['date']);
}

function filterOldTransactions(txns, startMoment, combineInstallments) {
  return txns.filter(txn => {
    const combineNeededAndInitialOrNormal = combineInstallments && (isNormalTransaction(txn) || isInitialInstallmentTransaction(txn));
    return !combineInstallments && startMoment.isSameOrBefore(txn.date) || combineNeededAndInitialOrNormal && startMoment.isSameOrBefore(txn.date);
  });
}