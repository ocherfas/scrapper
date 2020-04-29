"use strict";

require("core-js/modules/es.array.iterator");

require("core-js/modules/es.promise");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _lodash = _interopRequireDefault(require("lodash"));

var _moment = _interopRequireDefault(require("moment"));

var _baseScraperWithBrowser = require("./base-scraper-with-browser");

var _elementsInteractions = require("../helpers/elements-interactions");

var _navigation = require("../helpers/navigation");

var _fetch = require("../helpers/fetch");

var _constants = require("../constants");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const BASE_URL = 'https://start.telebank.co.il';
const DATE_FORMAT = 'YYYYMMDD';

function convertTransactions(txns, txnStatus) {
  if (!txns) {
    return [];
  }

  return txns.map(txn => {
    return {
      type: _constants.NORMAL_TXN_TYPE,
      identifier: txn.OperationNumber,
      date: (0, _moment.default)(txn.OperationDate, DATE_FORMAT).toISOString(),
      processedDate: (0, _moment.default)(txn.ValueDate, DATE_FORMAT).toISOString(),
      originalAmount: txn.OperationAmount,
      originalCurrency: 'ILS',
      chargedAmount: txn.OperationAmount,
      description: txn.OperationDescriptionToDisplay,
      status: txnStatus
    };
  });
}

async function fetchAccountData(page, options) {
  const apiSiteUrl = `${BASE_URL}/Titan/gatewayAPI`;
  const accountDataUrl = `${apiSiteUrl}/userAccountsData`;
  const accountInfo = await (0, _fetch.fetchGetWithinPage)(page, accountDataUrl);
  const accountNumber = accountInfo.UserAccountsData.DefaultAccountNumber;
  const defaultStartMoment = (0, _moment.default)().subtract(1, 'years').add(1, 'day');
  const startDate = options.startDate || defaultStartMoment.toDate();

  const startMoment = _moment.default.max(defaultStartMoment, (0, _moment.default)(startDate));

  const startDateStr = startMoment.format(DATE_FORMAT);
  const txnsUrl = `${apiSiteUrl}/lastTransactions/${accountNumber}/Date?IsCategoryDescCode=True&IsTransactionDetails=True&IsEventNames=True&IsFutureTransactionFlag=True&FromDate=${startDateStr}`;
  const txnsResult = await (0, _fetch.fetchGetWithinPage)(page, txnsUrl);

  if (txnsResult.Error) {
    return {
      success: false,
      errorType: 'generic',
      errorMessage: txnsResult.Error.MsgText
    };
  }

  const completedTxns = convertTransactions(txnsResult.CurrentAccountLastTransactions.OperationEntry, _constants.TRANSACTION_STATUS.COMPLETED);

  const rawFutureTxns = _lodash.default.get(txnsResult, 'CurrentAccountLastTransactions.FutureTransactionsBlock.FutureTransactionEntry');

  const pendingTxns = convertTransactions(rawFutureTxns, _constants.TRANSACTION_STATUS.PENDING);
  const accountData = {
    success: true,
    accounts: [{
      accountNumber,
      txns: [...completedTxns, ...pendingTxns]
    }]
  };
  return accountData;
}

async function navigateOrErrorLabel(page) {
  try {
    await (0, _navigation.waitForNavigation)(page);
  } catch (e) {
    await (0, _elementsInteractions.waitUntilElementFound)(page, '#general-error', false, 100);
  }
}

function getPossibleLoginResults() {
  const urls = {};
  urls[_baseScraperWithBrowser.LOGIN_RESULT.SUCCESS] = [`${BASE_URL}/apollo/core/templates/RETAIL/masterPage.html#/MY_ACCOUNT_HOMEPAGE`];
  urls[_baseScraperWithBrowser.LOGIN_RESULT.INVALID_PASSWORD] = [`${BASE_URL}/apollo/core/templates/lobby/masterPage.html#/LOGIN_PAGE`];
  urls[_baseScraperWithBrowser.LOGIN_RESULT.CHANGE_PASSWORD] = [`${BASE_URL}/apollo/core/templates/lobby/masterPage.html#/PWD_RENEW`];
  return urls;
}

function createLoginFields(credentials) {
  return [{
    selector: '#tzId',
    value: credentials.id
  }, {
    selector: '#tzPassword',
    value: credentials.password
  }, {
    selector: '#aidnum',
    value: credentials.num
  }];
}

class DiscountScraper extends _baseScraperWithBrowser.BaseScraperWithBrowser {
  getLoginOptions(credentials) {
    return {
      loginUrl: `${BASE_URL}/apollo/core/templates/lobby/masterPage.html#/LOGIN_PAGE`,
      checkReadiness: async () => (0, _elementsInteractions.waitUntilElementFound)(this.page, '#tzId'),
      fields: createLoginFields(credentials),
      submitButtonSelector: '.sendBtn',
      postAction: async () => navigateOrErrorLabel(this.page),
      possibleResults: getPossibleLoginResults()
    };
  }

  async fetchData() {
    return fetchAccountData(this.page, this.options, msg => this.notify(msg));
  }

}

var _default = DiscountScraper;
exports.default = _default;