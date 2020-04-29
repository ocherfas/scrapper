"use strict";

require("core-js/modules/es.array.iterator");

require("core-js/modules/es.promise");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _lodash = _interopRequireDefault(require("lodash"));

var _buildUrl = _interopRequireDefault(require("build-url"));

var _moment = _interopRequireDefault(require("moment"));

var _baseScraperWithBrowser = require("./base-scraper-with-browser");

var _fetch = require("../helpers/fetch");

var _constants = require("../constants");

var _dates = _interopRequireDefault(require("../helpers/dates"));

var _transactions = require("../helpers/transactions");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const COUNTRY_CODE = '212';
const ID_TYPE = '1';
const INSTALLMENTS_KEYWORD = 'תשלום';
const DATE_FORMAT = 'DD/MM/YYYY';

function getAccountsUrl(servicesUrl, monthMoment) {
  const billingDate = monthMoment.format('YYYY-MM-DD');
  return (0, _buildUrl.default)(servicesUrl, {
    queryParams: {
      reqName: 'DashboardMonth',
      actionCode: 0,
      billingDate,
      format: 'Json'
    }
  });
}

async function fetchAccounts(page, servicesUrl, monthMoment) {
  const dataUrl = getAccountsUrl(servicesUrl, monthMoment);
  const dataResult = await (0, _fetch.fetchGetWithinPage)(page, dataUrl);

  if (_lodash.default.get(dataResult, 'Header.Status') === '1' && dataResult.DashboardMonthBean) {
    const {
      cardsCharges
    } = dataResult.DashboardMonthBean;

    if (cardsCharges) {
      return cardsCharges.map(cardCharge => {
        return {
          index: parseInt(cardCharge.cardIndex, 10),
          accountNumber: cardCharge.cardNumber,
          processedDate: (0, _moment.default)(cardCharge.billingDate, DATE_FORMAT).toISOString()
        };
      });
    }
  }

  return null;
}

function getTransactionsUrl(servicesUrl, monthMoment) {
  const month = monthMoment.month() + 1;
  const year = monthMoment.year();
  const monthStr = month < 10 ? `0${month}` : month.toString();
  return (0, _buildUrl.default)(servicesUrl, {
    queryParams: {
      reqName: 'CardsTransactionsList',
      month: monthStr,
      year,
      requiredDate: 'N'
    }
  });
}

function convertCurrency(currencyStr) {
  if (currencyStr === _constants.SHEKEL_CURRENCY_KEYWORD || currencyStr === _constants.ALT_SHEKEL_CURRENCY) {
    return _constants.SHEKEL_CURRENCY;
  }

  return currencyStr;
}

function getInstallmentsInfo(txn) {
  if (!txn.moreInfo || !txn.moreInfo.includes(INSTALLMENTS_KEYWORD)) {
    return null;
  }

  const matches = txn.moreInfo.match(/\d+/g);

  if (!matches || matches.length < 2) {
    return null;
  }

  return {
    number: parseInt(matches[0], 10),
    total: parseInt(matches[1], 10)
  };
}

function getTransactionType(txn) {
  return getInstallmentsInfo(txn) ? _constants.INSTALLMENTS_TXN_TYPE : _constants.NORMAL_TXN_TYPE;
}

function convertTransactions(txns, processedDate) {
  const filteredTxns = txns.filter(txn => txn.dealSumType !== '1' && txn.voucherNumberRatz !== '000000000' && txn.voucherNumberRatzOutbound !== '000000000');
  return filteredTxns.map(txn => {
    const isOutbound = txn.dealSumOutbound;
    const txnDateStr = isOutbound ? txn.fullPurchaseDateOutbound : txn.fullPurchaseDate;
    const txnMoment = (0, _moment.default)(txnDateStr, DATE_FORMAT);
    return {
      type: getTransactionType(txn),
      identifier: isOutbound ? txn.voucherNumberRatzOutbound : txn.voucherNumberRatz,
      date: txnMoment.toISOString(),
      processedDate,
      originalAmount: isOutbound ? -txn.dealSumOutbound : -txn.dealSum,
      originalCurrency: convertCurrency(txn.currencyId),
      chargedAmount: isOutbound ? -txn.paymentSumOutbound : -txn.paymentSum,
      description: isOutbound ? txn.fullSupplierNameOutbound : txn.fullSupplierNameHeb,
      memo: txn.moreInfo,
      installments: getInstallmentsInfo(txn),
      status: _constants.TRANSACTION_STATUS.COMPLETED
    };
  });
}

async function fetchTransactions(page, options, startMoment, monthMoment) {
  const accounts = await fetchAccounts(page, options.servicesUrl, monthMoment);
  const dataUrl = getTransactionsUrl(options.servicesUrl, monthMoment);
  const dataResult = await (0, _fetch.fetchGetWithinPage)(page, dataUrl);

  if (_lodash.default.get(dataResult, 'Header.Status') === '1' && dataResult.CardsTransactionsListBean) {
    const accountTxns = {};
    accounts.forEach(account => {
      const txnGroups = _lodash.default.get(dataResult, `CardsTransactionsListBean.Index${account.index}.CurrentCardTransactions`);

      if (txnGroups) {
        let allTxns = [];
        txnGroups.forEach(txnGroup => {
          if (txnGroup.txnIsrael) {
            const txns = convertTransactions(txnGroup.txnIsrael, account.processedDate);
            allTxns.push(...txns);
          }

          if (txnGroup.txnAbroad) {
            const txns = convertTransactions(txnGroup.txnAbroad, account.processedDate);
            allTxns.push(...txns);
          }
        });

        if (!options.combineInstallments) {
          allTxns = (0, _transactions.fixInstallments)(allTxns);
        }

        allTxns = (0, _transactions.filterOldTransactions)(allTxns, startMoment, options.combineInstallments);
        accountTxns[account.accountNumber] = {
          accountNumber: account.accountNumber,
          index: account.index,
          txns: allTxns
        };
      }
    });
    return accountTxns;
  }

  return null;
}

async function fetchAllTransactions(page, options, startMoment) {
  const allMonths = (0, _dates.default)(startMoment, true);
  const results = await Promise.all(allMonths.map(async monthMoment => {
    return fetchTransactions(page, options, startMoment, monthMoment);
  }));
  const combinedTxns = {};
  results.forEach(result => {
    Object.keys(result).forEach(accountNumber => {
      let txnsForAccount = combinedTxns[accountNumber];

      if (!txnsForAccount) {
        txnsForAccount = [];
        combinedTxns[accountNumber] = txnsForAccount;
      }

      const toBeAddedTxns = result[accountNumber].txns;
      combinedTxns[accountNumber].push(...toBeAddedTxns);
    });
  });
  const accounts = Object.keys(combinedTxns).map(accountNumber => {
    return {
      accountNumber,
      txns: combinedTxns[accountNumber]
    };
  });
  return {
    success: true,
    accounts
  };
}

class IsracardAmexBaseScraper extends _baseScraperWithBrowser.BaseScraperWithBrowser {
  constructor(options, baseUrl, companyCode) {
    const clonedOptions = Object.assign(options, {
      baseUrl,
      servicesUrl: `${baseUrl}/services/ProxyRequestHandler.ashx`,
      companyCode
    });
    super(clonedOptions);
  }

  async login(credentials) {
    await this.navigateTo(`${this.options.baseUrl}/personalarea/Login`);
    this.emitProgress(_constants.SCRAPE_PROGRESS_TYPES.LOGGING_IN);
    const validateUrl = `${this.options.servicesUrl}?reqName=ValidateIdData`;
    const validateRequest = {
      id: credentials.id,
      cardSuffix: credentials.card6Digits,
      countryCode: COUNTRY_CODE,
      idType: ID_TYPE,
      checkLevel: '1',
      companyCode: this.options.companyCode
    };
    const validateResult = await (0, _fetch.fetchPostWithinPage)(this.page, validateUrl, validateRequest);

    if (!validateResult || !validateResult.Header || validateResult.Header.Status !== '1' || !validateResult.ValidateIdDataBean) {
      throw new Error('unknown error during login');
    }

    const validateReturnCode = validateResult.ValidateIdDataBean.returnCode;

    if (validateReturnCode === '1') {
      const {
        userName
      } = validateResult.ValidateIdDataBean;
      const loginUrl = `${this.options.servicesUrl}?reqName=performLogonI`;
      const request = {
        KodMishtamesh: userName,
        MisparZihuy: credentials.id,
        Sisma: credentials.password,
        cardSuffix: credentials.card6Digits,
        countryCode: COUNTRY_CODE,
        idType: ID_TYPE
      };
      const loginResult = await (0, _fetch.fetchPostWithinPage)(this.page, loginUrl, request);

      if (loginResult.status === '1') {
        this.emitProgress(_constants.SCRAPE_PROGRESS_TYPES.LOGIN_SUCCESS);
        return {
          success: true
        };
      }

      if (loginResult.status === '3') {
        this.emitProgress(_constants.SCRAPE_PROGRESS_TYPES.CHANGE_PASSWORD);
        return {
          success: false,
          errorType: _baseScraperWithBrowser.LOGIN_RESULT.CHANGE_PASSWORD
        };
      }

      this.emitProgress(_constants.SCRAPE_PROGRESS_TYPES.LOGIN_FAILED);
      return {
        success: false,
        errorType: _baseScraperWithBrowser.LOGIN_RESULT.INVALID_PASSWORD
      };
    }

    if (validateReturnCode === '4') {
      this.emitProgress(_constants.SCRAPE_PROGRESS_TYPES.CHANGE_PASSWORD);
      return {
        success: false,
        errorType: _baseScraperWithBrowser.LOGIN_RESULT.CHANGE_PASSWORD
      };
    }

    this.emitProgress(_constants.SCRAPE_PROGRESS_TYPES.LOGIN_FAILED);
    return {
      success: false,
      errorType: _baseScraperWithBrowser.LOGIN_RESULT.INVALID_PASSWORD
    };
  }

  async fetchData() {
    const defaultStartMoment = (0, _moment.default)().subtract(1, 'years');
    const startDate = this.options.startDate || defaultStartMoment.toDate();

    const startMoment = _moment.default.max(defaultStartMoment, (0, _moment.default)(startDate));

    return fetchAllTransactions(this.page, this.options, startMoment);
  }

}

var _default = IsracardAmexBaseScraper;
exports.default = _default;