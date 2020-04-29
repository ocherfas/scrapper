"use strict";

require("core-js/modules/es.array.iterator");

require("core-js/modules/es.promise");

require("core-js/modules/es.string.replace");

require("core-js/modules/es.string.trim");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _buildUrl = _interopRequireDefault(require("build-url"));

var _moment = _interopRequireDefault(require("moment"));

var _fetch = require("../helpers/fetch");

var _baseScraperWithBrowser = require("./base-scraper-with-browser");

var _navigation = require("../helpers/navigation");

var _elementsInteractions = require("../helpers/elements-interactions");

var _constants = require("../constants");

var _dates = _interopRequireDefault(require("../helpers/dates"));

var _transactions = require("../helpers/transactions");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const BASE_ACTIONS_URL = 'https://online.max.co.il';
const BASE_API_ACTIONS_URL = 'https://onlinelcapi.max.co.il';
const BASE_WELCOME_URL = 'https://www.max.co.il';
const NORMAL_TYPE_NAME = 'רגילה';
const ATM_TYPE_NAME = 'חיוב עסקות מיידי';
const INTERNET_SHOPPING_TYPE_NAME = 'אינטרנט/חו"ל';
const INSTALLMENTS_TYPE_NAME = 'תשלומים';
const MONTHLY_CHARGE_TYPE_NAME = 'חיוב חודשי';
const ONE_MONTH_POSTPONED_TYPE_NAME = 'דחוי חודש';
const MONTHLY_POSTPONED_TYPE_NAME = 'דחוי לחיוב החודשי';
const MONTHLY_PAYMENT_TYPE_NAME = 'תשלום חודשי';
const FUTURE_PURCHASE_FINANCING = 'מימון לרכישה עתידית';
const MONTHLY_POSTPONED_INSTALLMENTS_TYPE_NAME = 'דחוי חודש תשלומים';
const THIRTY_DAYS_PLUS_TYPE_NAME = 'עסקת 30 פלוס';
const TWO_MONTHS_POSTPONED_TYPE_NAME = 'דחוי חודשיים';
const MONTHLY_CHARGE_PLUS_INTEREST_TYPE_NAME = 'חודשי + ריבית';
const CREDIT_TYPE_NAME = 'קרדיט';
const INVALID_DETAILS_SELECTOR = '#popupWrongDetails';
const LOGIN_ERROR_SELECTOR = '#popupCardHoldersLoginError';

function redirectOrDialog(page) {
  return Promise.race([(0, _navigation.waitForRedirect)(page, 20000, false, [BASE_WELCOME_URL, `${BASE_WELCOME_URL}/`]), (0, _elementsInteractions.waitUntilElementFound)(page, INVALID_DETAILS_SELECTOR, true), (0, _elementsInteractions.waitUntilElementFound)(page, LOGIN_ERROR_SELECTOR, true)]);
}

function getTransactionsUrl(monthMoment) {
  const month = monthMoment.month() + 1;
  const year = monthMoment.year();
  const date = `${year}-${month}-01`;
  /**
     * url explanation:
     * userIndex: -1 for all account owners
     * cardIndex: -1 for all cards under the account
     * all other query params are static, beside the date which changes for request per month
     */

  return (0, _buildUrl.default)(BASE_API_ACTIONS_URL, {
    path: `/api/registered/transactionDetails/getTransactionsAndGraphs?filterData={"userIndex":-1,"cardIndex":-1,"monthView":true,"date":"${date}","dates":{"startDate":"0","endDate":"0"}}&v=V3.13-HF.6.26`
  });
}

function getTransactionType(txnTypeStr) {
  const cleanedUpTxnTypeStr = txnTypeStr.replace('\t', ' ').trim();

  switch (cleanedUpTxnTypeStr) {
    case ATM_TYPE_NAME:
    case NORMAL_TYPE_NAME:
    case MONTHLY_CHARGE_TYPE_NAME:
    case ONE_MONTH_POSTPONED_TYPE_NAME:
    case MONTHLY_POSTPONED_TYPE_NAME:
    case FUTURE_PURCHASE_FINANCING:
    case MONTHLY_PAYMENT_TYPE_NAME:
    case MONTHLY_POSTPONED_INSTALLMENTS_TYPE_NAME:
    case THIRTY_DAYS_PLUS_TYPE_NAME:
    case TWO_MONTHS_POSTPONED_TYPE_NAME:
    case INTERNET_SHOPPING_TYPE_NAME:
    case MONTHLY_CHARGE_PLUS_INTEREST_TYPE_NAME:
      return _constants.NORMAL_TXN_TYPE;

    case INSTALLMENTS_TYPE_NAME:
    case CREDIT_TYPE_NAME:
      return _constants.INSTALLMENTS_TXN_TYPE;

    default:
      throw new Error(`Unknown transaction type ${cleanedUpTxnTypeStr}`);
  }
}

function getInstallmentsInfo(comments) {
  if (!comments) {
    return null;
  }

  const matches = comments.match(/\d+/g);

  if (!matches || matches.length < 2) {
    return null;
  }

  return {
    number: parseInt(matches[0], 10),
    total: parseInt(matches[1], 10)
  };
}

function mapTransaction(rawTransaction) {
  const isPending = rawTransaction.paymentDate === null;
  const processedDate = (0, _moment.default)(isPending ? rawTransaction.purchaseDate : rawTransaction.paymentDate).toISOString();
  const status = isPending ? _constants.TRANSACTION_STATUS.PENDING : _constants.TRANSACTION_STATUS.COMPLETED;
  return {
    type: getTransactionType(rawTransaction.planName),
    date: (0, _moment.default)(rawTransaction.purchaseDate).toISOString(),
    processedDate,
    originalAmount: -rawTransaction.originalAmount,
    originalCurrency: rawTransaction.originalCurrency,
    chargedAmount: -rawTransaction.actualPaymentAmount,
    description: rawTransaction.merchantName.trim(),
    memo: rawTransaction.comments,
    installments: getInstallmentsInfo(rawTransaction.comments),
    status
  };
}

async function fetchTransactionsForMonth(page, monthMoment) {
  const url = getTransactionsUrl(monthMoment);
  const data = await (0, _fetch.fetchGetWithinPage)(page, url);
  const transactionsByAccount = {};
  if (!data.result) return transactionsByAccount;
  data.result.transactions.forEach(transaction => {
    if (!transactionsByAccount[transaction.shortCardNumber]) {
      transactionsByAccount[transaction.shortCardNumber] = [];
    }

    const mappedTransaction = mapTransaction(transaction);
    transactionsByAccount[transaction.shortCardNumber].push(mappedTransaction);
  });
  return transactionsByAccount;
}

function addResult(allResults, result) {
  const clonedResults = _objectSpread({}, allResults);

  Object.keys(result).forEach(accountNumber => {
    if (!clonedResults[accountNumber]) {
      clonedResults[accountNumber] = [];
    }

    clonedResults[accountNumber].push(...result[accountNumber]);
  });
  return clonedResults;
}

function prepareTransactions(txns, startMoment, combineInstallments) {
  let clonedTxns = Array.from(txns);

  if (!combineInstallments) {
    clonedTxns = (0, _transactions.fixInstallments)(clonedTxns);
  }

  clonedTxns = (0, _transactions.sortTransactionsByDate)(clonedTxns);
  clonedTxns = (0, _transactions.filterOldTransactions)(clonedTxns, startMoment, combineInstallments);
  return clonedTxns;
}

async function fetchTransactions(page, options) {
  const defaultStartMoment = (0, _moment.default)().subtract(1, 'years');
  const startDate = options.startDate || defaultStartMoment.toDate();

  const startMoment = _moment.default.max(defaultStartMoment, (0, _moment.default)(startDate));

  const allMonths = (0, _dates.default)(startMoment, true);
  let allResults = {};

  for (let i = 0; i < allMonths.length; i += 1) {
    const result = await fetchTransactionsForMonth(page, allMonths[i]);
    allResults = addResult(allResults, result);
  }

  Object.keys(allResults).forEach(accountNumber => {
    let txns = allResults[accountNumber];
    txns = prepareTransactions(txns, startMoment, options.combineInstallments);
    allResults[accountNumber] = txns;
  });
  return allResults;
}

function getPossibleLoginResults(page) {
  const urls = {};
  urls[_baseScraperWithBrowser.LOGIN_RESULT.SUCCESS] = [`${BASE_WELCOME_URL}/homepage/personal`];
  urls[_baseScraperWithBrowser.LOGIN_RESULT.CHANGE_PASSWORD] = [`${BASE_ACTIONS_URL}/Anonymous/Login/PasswordExpired.aspx`];
  urls[_baseScraperWithBrowser.LOGIN_RESULT.INVALID_PASSWORD] = [async () => {
    return (0, _elementsInteractions.elementPresentOnPage)(page, INVALID_DETAILS_SELECTOR);
  }];
  urls[_baseScraperWithBrowser.LOGIN_RESULT.UNKNOWN_ERROR] = [async () => {
    return (0, _elementsInteractions.elementPresentOnPage)(page, LOGIN_ERROR_SELECTOR);
  }];
  return urls;
}

function createLoginFields(inputGroupName, credentials) {
  return [{
    selector: `#${inputGroupName}_txtUserName`,
    value: credentials.username
  }, {
    selector: '#txtPassword',
    value: credentials.password
  }];
}

class MaxScraper extends _baseScraperWithBrowser.BaseScraperWithBrowser {
  getLoginOptions(credentials) {
    const inputGroupName = 'PlaceHolderMain_CardHoldersLogin1';
    return {
      loginUrl: `${BASE_ACTIONS_URL}/Anonymous/Login/CardholdersLogin.aspx`,
      fields: createLoginFields(inputGroupName, credentials),
      submitButtonSelector: `#${inputGroupName}_btnLogin`,
      preAction: async () => {
        if (await (0, _elementsInteractions.elementPresentOnPage)(this.page, '#closePopup')) {
          await (0, _elementsInteractions.clickButton)(this.page, '#closePopup');
        }
      },
      postAction: async () => redirectOrDialog(this.page),
      possibleResults: getPossibleLoginResults(this.page)
    };
  }

  async fetchData() {
    const results = await fetchTransactions(this.page, this.options);
    const accounts = Object.keys(results).map(accountNumber => {
      return {
        accountNumber,
        txns: results[accountNumber]
      };
    });
    return {
      success: true,
      accounts
    };
  }

}

var _default = MaxScraper;
exports.default = _default;