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

var _baseScraper = require("./base-scraper");

var _constants = require("../constants");

var _fetch = require("../helpers/fetch");

var _transactions = require("../helpers/transactions");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const BASE_URL = 'https://cal4u.cal-online.co.il/Cal4U';
const AUTH_URL = 'https://connect.cal-online.co.il/api/authentication/login';
const DATE_FORMAT = 'DD/MM/YYYY';
const PASSWORD_EXPIRED_MSG = 'תוקף הסיסמא פג';
const INVALID_CREDENTIALS = 'שם המשתמש או הסיסמה שהוזנו שגויים';
const NO_DATA_FOUND_MSG = 'לא נמצאו חיובים לטווח תאריכים זה';
const NORMAL_TYPE_CODE = '5';
const REFUND_TYPE_CODE = '6';
const WITHDRAWAL_TYPE_CODE = '7';
const INSTALLMENTS_TYPE_CODE = '8';
const CANCEL_TYPE_CODE = '25';
const WITHDRAWAL_TYPE_CODE_2 = '27';
const CREDIT_PAYMENTS_CODE = '59';
const MEMBERSHIP_FEE_TYPE_CODE = '67';
const SERVICES_REFUND_TYPE_CODE = '71';
const SERVICES_TYPE_CODE = '72';
const REFUND_TYPE_CODE_2 = '76';
const HEADER_SITE = {
  'X-Site-Id': '8D37DF16-5812-4ACD-BAE7-CD1A5BFA2206'
};

function getBankDebitsUrl(accountId) {
  const toDate = (0, _moment.default)().add(2, 'months');
  const fromDate = (0, _moment.default)().subtract(6, 'months');
  return (0, _buildUrl.default)(BASE_URL, {
    path: `CalBankDebits/${accountId}`,
    queryParams: {
      DebitLevel: 'A',
      DebitType: '2',
      FromMonth: (fromDate.month() + 1).toString().padStart(2, '0'),
      FromYear: fromDate.year().toString(),
      ToMonth: (toDate.month() + 1).toString().padStart(2, '0'),
      ToYear: toDate.year().toString()
    }
  });
}

function getTransactionsUrl(cardId, debitDate) {
  return (0, _buildUrl.default)(BASE_URL, {
    path: `CalTransactions/${cardId}`,
    queryParams: {
      ToDate: debitDate,
      FromDate: debitDate
    }
  });
}

function convertTransactionType(txnType) {
  switch (txnType) {
    case NORMAL_TYPE_CODE:
    case REFUND_TYPE_CODE:
    case CANCEL_TYPE_CODE:
    case WITHDRAWAL_TYPE_CODE:
    case WITHDRAWAL_TYPE_CODE_2:
    case REFUND_TYPE_CODE_2:
    case SERVICES_REFUND_TYPE_CODE:
    case MEMBERSHIP_FEE_TYPE_CODE:
    case SERVICES_TYPE_CODE:
      return _constants.NORMAL_TXN_TYPE;

    case INSTALLMENTS_TYPE_CODE:
    case CREDIT_PAYMENTS_CODE:
      return _constants.INSTALLMENTS_TXN_TYPE;

    default:
      throw new Error(`unknown transaction type ${txnType}`);
  }
}

function convertCurrency(currency) {
  switch (currency) {
    case _constants.SHEKEL_CURRENCY_SYMBOL:
      return _constants.SHEKEL_CURRENCY;

    case _constants.DOLLAR_CURRENCY_SYMBOL:
      return _constants.DOLLAR_CURRENCY;

    default:
      return currency;
  }
}

function getInstallmentsInfo(txn) {
  if (!txn.CurrentPayment || txn.CurrentPayment === '0') {
    return null;
  }

  return {
    number: parseInt(txn.CurrentPayment, 10),
    total: parseInt(txn.TotalPayments, 10)
  };
}

function getTransactionMemo(txn) {
  const {
    TransType: txnType,
    TransTypeDesc: txnTypeDescription
  } = txn;

  switch (txnType) {
    case NORMAL_TYPE_CODE:
      return txnTypeDescription === 'רכישה רגילה' ? '' : txnTypeDescription;

    case INSTALLMENTS_TYPE_CODE:
      return `תשלום ${txn.CurrentPayment} מתוך ${txn.TotalPayments}`;

    default:
      return txn.TransTypeDesc;
  }
}

function convertTransactions(txns) {
  return txns.map(txn => {
    return {
      type: convertTransactionType(txn.TransType),
      date: (0, _moment.default)(txn.Date, DATE_FORMAT).toISOString(),
      processedDate: (0, _moment.default)(txn.DebitDate, DATE_FORMAT).toISOString(),
      originalAmount: -txn.Amount.Value,
      originalCurrency: convertCurrency(txn.Amount.Symbol),
      chargedAmount: -txn.DebitAmount.Value,
      description: txn.MerchantDetails.Name,
      memo: getTransactionMemo(txn),
      installments: getInstallmentsInfo(txn),
      status: _constants.TRANSACTION_STATUS.COMPLETED
    };
  });
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

async function getBankDebits(authHeader, accountId) {
  const bankDebitsUrl = getBankDebitsUrl(accountId);
  return (0, _fetch.fetchGet)(bankDebitsUrl, authHeader);
}

async function getTransactionsNextPage(authHeader) {
  const hasNextPageUrl = `${BASE_URL}/CalTransNextPage`;
  return (0, _fetch.fetchGet)(hasNextPageUrl, authHeader);
}

async function fetchTxns(authHeader, cardId, debitDates) {
  const txns = [];

  for (const date of debitDates) {
    const fetchTxnUrl = getTransactionsUrl(cardId, date);
    let txnResponse = await (0, _fetch.fetchGet)(fetchTxnUrl, authHeader);

    if (txnResponse.Transactions) {
      txns.push(...txnResponse.Transactions);
    }

    while (txnResponse.HasNextPage) {
      txnResponse = await getTransactionsNextPage(authHeader);

      if (txnResponse.Transactions != null) {
        txns.push(...txnResponse.Transactions);
      }
    }
  }

  return txns;
}

async function getTxnsOfCard(authHeader, card, bankDebits) {
  const cardId = card.Id;
  const cardDebitDates = bankDebits.filter(bankDebit => {
    return bankDebit.CardId === cardId;
  }).map(cardDebit => {
    return cardDebit.Date;
  });
  return fetchTxns(authHeader, cardId, cardDebitDates);
}

async function getTransactionsForAllAccounts(authHeader, startMoment, options) {
  const cardsByAccountUrl = `${BASE_URL}/CardsByAccounts`;
  const banksResponse = await (0, _fetch.fetchGet)(cardsByAccountUrl, authHeader);

  if (_lodash.default.get(banksResponse, 'Response.Status.Succeeded')) {
    const accounts = [];

    for (let i = 0; i < banksResponse.BankAccounts.length; i += 1) {
      const bank = banksResponse.BankAccounts[i];
      const bankDebits = await getBankDebits(authHeader, bank.AccountID); // Check that the bank has an active card to scrape

      if (bank.Cards.some(card => card.IsEffectiveInd)) {
        if (_lodash.default.get(bankDebits, 'Response.Status.Succeeded')) {
          for (let j = 0; j < bank.Cards.length; j += 1) {
            const rawTxns = await getTxnsOfCard(authHeader, bank.Cards[j], bankDebits.Debits);

            if (rawTxns) {
              let txns = convertTransactions(rawTxns);
              txns = prepareTransactions(txns, startMoment, options.combineInstallments);
              const result = {
                accountNumber: bank.Cards[j].LastFourDigits,
                txns
              };
              accounts.push(result);
            }
          }
        } else {
          const {
            Description,
            Message
          } = bankDebits.Response.Status;

          if (Message !== NO_DATA_FOUND_MSG) {
            const message = `${Description}. ${Message}`;
            throw new Error(message);
          }
        }
      }
    }

    return {
      success: true,
      accounts
    };
  }

  return {
    success: false
  };
}

class VisaCalScraper extends _baseScraper.BaseScraper {
  async login(credentials) {
    const authRequest = {
      username: credentials.username,
      password: credentials.password,
      rememberMe: null
    };
    this.emitProgress(_constants.SCRAPE_PROGRESS_TYPES.LOGGING_IN);
    const authResponse = await (0, _fetch.fetchPost)(AUTH_URL, authRequest, HEADER_SITE);

    if (authResponse === PASSWORD_EXPIRED_MSG) {
      return {
        success: false,
        errorType: _baseScraper.LOGIN_RESULT.CHANGE_PASSWORD
      };
    }

    if (authResponse === INVALID_CREDENTIALS) {
      return {
        success: false,
        errorType: _baseScraper.LOGIN_RESULT.INVALID_PASSWORD
      };
    }

    if (!authResponse || !authResponse.token) {
      return {
        success: false,
        errorType: _baseScraper.LOGIN_RESULT.UNKNOWN_ERROR,
        errorMessage: `No token found in authResponse: ${JSON.stringify(authResponse)}`
      };
    }

    this.authHeader = `CALAuthScheme ${authResponse.token}`;
    this.emitProgress(_constants.SCRAPE_PROGRESS_TYPES.LOGIN_SUCCESS);
    return {
      success: true
    };
  }

  async fetchData() {
    const defaultStartMoment = (0, _moment.default)().subtract(1, 'years');
    const startDate = this.options.startDate || defaultStartMoment.toDate();

    const startMoment = _moment.default.max(defaultStartMoment, (0, _moment.default)(startDate));

    const authHeader = _objectSpread({
      Authorization: this.authHeader
    }, HEADER_SITE);

    return getTransactionsForAllAccounts(authHeader, startMoment, this.options);
  }

}

var _default = VisaCalScraper;
exports.default = _default;