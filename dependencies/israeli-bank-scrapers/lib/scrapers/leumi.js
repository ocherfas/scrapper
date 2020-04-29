"use strict";

require("core-js/modules/es.symbol.description");

require("core-js/modules/es.array.iterator");

require("core-js/modules/es.promise");

require("core-js/modules/es.string.replace");

require("core-js/modules/es.string.trim");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _moment = _interopRequireDefault(require("moment"));

var _baseScraperWithBrowser = require("./base-scraper-with-browser");

var _elementsInteractions = require("../helpers/elements-interactions");

var _navigation = require("../helpers/navigation");

var _constants = require("../constants");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const BASE_URL = 'https://hb2.bankleumi.co.il';
const DATE_FORMAT = 'DD/MM/YY';
const NO_TRANSACTION_IN_DATE_RANGE_TEXT = 'לא קיימות תנועות מתאימות על פי הסינון שהוגדר';

function getTransactionsUrl() {
  return `${BASE_URL}/ebanking/Accounts/ExtendedActivity.aspx?WidgetPar=1#/`;
}

function getPossibleLoginResults() {
  const urls = {};
  urls[_baseScraperWithBrowser.LOGIN_RESULT.SUCCESS] = [/ebanking\/SO\/SPA.aspx/i];
  urls[_baseScraperWithBrowser.LOGIN_RESULT.INVALID_PASSWORD] = [/InternalSite\/CustomUpdate\/leumi\/LoginPage.ASP/]; // urls[LOGIN_RESULT.CHANGE_PASSWORD] = ``; // TODO should wait until my password expires

  return urls;
}

function createLoginFields(credentials) {
  return [{
    selector: '#wtr_uid',
    value: credentials.username
  }, {
    selector: '#wtr_password',
    value: credentials.password
  }];
}

function getAmountData(amountStr) {
  const amountStrCopy = amountStr.replace(',', '');
  const amount = parseFloat(amountStrCopy);
  const currency = _constants.SHEKEL_CURRENCY;
  return {
    amount,
    currency
  };
}

function convertTransactions(txns) {
  return txns.map(txn => {
    const txnDate = (0, _moment.default)(txn.date, DATE_FORMAT).toISOString();
    const credit = getAmountData(txn.credit).amount;
    const debit = getAmountData(txn.debit).amount;
    const amount = (Number.isNaN(credit) ? 0 : credit) - (Number.isNaN(debit) ? 0 : debit);
    return {
      type: _constants.NORMAL_TXN_TYPE,
      identifier: txn.reference ? parseInt(txn.reference, 10) : null,
      date: txnDate,
      processedDate: txnDate,
      originalAmount: amount,
      originalCurrency: _constants.SHEKEL_CURRENCY,
      chargedAmount: amount,
      status: txn.status,
      description: txn.description,
      memo: txn.memo
    };
  });
}

async function extractCompletedTransactionsFromPage(page) {
  const txns = [];
  const tdsValues = await (0, _elementsInteractions.pageEvalAll)(page, '#WorkSpaceBox #ctlActivityTable tr td', [], tds => {
    return tds.map(td => ({
      classList: td.getAttribute('class'),
      innerText: td.innerText
    }));
  });

  for (const element of tdsValues) {
    if (element.classList.includes('ExtendedActivityColumnDate')) {
      const newTransaction = {
        status: _constants.TRANSACTION_STATUS.COMPLETED
      };
      newTransaction.date = (element.innerText || '').trim();
      txns.push(newTransaction);
    } else if (element.classList.includes('ActivityTableColumn1LTR') || element.classList.includes('ActivityTableColumn1')) {
      const changedTransaction = txns.pop();
      changedTransaction.description = element.innerText;
      txns.push(changedTransaction);
    } else if (element.classList.includes('ReferenceNumberUniqeClass')) {
      const changedTransaction = txns.pop();
      changedTransaction.reference = element.innerText;
      txns.push(changedTransaction);
    } else if (element.classList.includes('AmountDebitUniqeClass')) {
      const changedTransaction = txns.pop();
      changedTransaction.debit = element.innerText;
      txns.push(changedTransaction);
    } else if (element.classList.includes('AmountCreditUniqeClass')) {
      const changedTransaction = txns.pop();
      changedTransaction.credit = element.innerText;
      txns.push(changedTransaction);
    } else if (element.classList.includes('number_column')) {
      const changedTransaction = txns.pop();
      changedTransaction.balance = element.innerText;
      txns.push(changedTransaction);
    } else if (element.classList.includes('tdDepositRowAdded')) {
      const changedTransaction = txns.pop();
      changedTransaction.memo = (element.innerText || '').trim();
      txns.push(changedTransaction);
    }
  }

  return txns;
}

async function extractPendingTransactionsFromPage(page) {
  const txns = [];
  const tdsValues = await (0, _elementsInteractions.pageEvalAll)(page, '#WorkSpaceBox #trTodayActivityNapaTableUpper tr td', [], tds => {
    return tds.map(td => ({
      classList: td.getAttribute('class'),
      innerText: td.innerText
    }));
  });

  for (const element of tdsValues) {
    if (element.classList.includes('Colume1Width')) {
      const newTransaction = {
        status: _constants.TRANSACTION_STATUS.PENDING
      };
      newTransaction.date = (element.innerText || '').trim();
      txns.push(newTransaction);
    } else if (element.classList.includes('Colume2Width')) {
      const changedTransaction = txns.pop();
      changedTransaction.description = element.innerText;
      txns.push(changedTransaction);
    } else if (element.classList.includes('Colume3Width')) {
      const changedTransaction = txns.pop();
      changedTransaction.reference = element.innerText;
      txns.push(changedTransaction);
    } else if (element.classList.includes('Colume4Width')) {
      const changedTransaction = txns.pop();
      changedTransaction.debit = element.innerText;
      txns.push(changedTransaction);
    } else if (element.classList.includes('Colume5Width')) {
      const changedTransaction = txns.pop();
      changedTransaction.credit = element.innerText;
      txns.push(changedTransaction);
    } else if (element.classList.includes('Colume6Width')) {
      const changedTransaction = txns.pop();
      changedTransaction.balance = element.innerText;
      txns.push(changedTransaction);
    }
  }

  return txns;
}

async function isNoTransactionInDateRangeError(page) {
  const hasErrorInfoElement = await (0, _elementsInteractions.elementPresentOnPage)(page, '.errInfo');

  if (hasErrorInfoElement) {
    const errorText = await page.$eval('.errInfo', errorElement => {
      return errorElement.innerText;
    });
    return errorText === NO_TRANSACTION_IN_DATE_RANGE_TEXT;
  }

  return false;
}

async function fetchTransactionsForAccount(page, startDate, accountId) {
  await (0, _elementsInteractions.dropdownSelect)(page, 'select#ddlAccounts_m_ddl', accountId);
  await (0, _elementsInteractions.dropdownSelect)(page, 'select#ddlTransactionPeriod', '004');
  await (0, _elementsInteractions.waitUntilElementFound)(page, 'select#ddlTransactionPeriod');
  await (0, _elementsInteractions.fillInput)(page, 'input#dtFromDate_textBox', startDate.format(DATE_FORMAT));
  await (0, _elementsInteractions.clickButton)(page, 'input#btnDisplayDates');
  await (0, _navigation.waitForNavigation)(page);
  const selectedSnifAccount = await page.$eval('#ddlAccounts_m_ddl option[selected="selected"]', option => {
    return option.innerText;
  });
  const accountNumber = selectedSnifAccount.replace('/', '_');
  await Promise.race([(0, _elementsInteractions.waitUntilElementFound)(page, 'table#WorkSpaceBox table#ctlActivityTable', false), (0, _elementsInteractions.waitUntilElementFound)(page, '.errInfo', false)]);

  if (await isNoTransactionInDateRangeError(page)) {
    return {
      accountNumber,
      txns: []
    };
  }

  const hasExpandAllButton = await (0, _elementsInteractions.elementPresentOnPage)(page, 'a#lnkCtlExpandAllInPage');

  if (hasExpandAllButton) {
    await (0, _elementsInteractions.clickButton)(page, 'a#lnkCtlExpandAllInPage');
  }

  const pendingTxns = await extractPendingTransactionsFromPage(page);
  const completedTxns = await extractCompletedTransactionsFromPage(page);
  const txns = [...pendingTxns, ...completedTxns];
  return {
    accountNumber,
    txns: convertTransactions(txns)
  };
}

async function fetchTransactions(page, startDate) {
  const res = []; // Loop through all available accounts and collect transactions from all

  const accounts = await (0, _elementsInteractions.dropdownElements)(page, 'select#ddlAccounts_m_ddl');

  for (const account of accounts) {
    // Skip "All accounts" option
    if (account.value !== '-1') {
      res.push((await fetchTransactionsForAccount(page, startDate, account.value)));
    }
  }

  return res;
}

async function waitForPostLogin(page) {
  // TODO check for condition to provide new password
  return Promise.race([(0, _elementsInteractions.waitUntilElementFound)(page, 'div.leumi-container', true), (0, _elementsInteractions.waitUntilElementFound)(page, '#loginErrMsg', true)]);
}

class LeumiScraper extends _baseScraperWithBrowser.BaseScraperWithBrowser {
  getLoginOptions(credentials) {
    return {
      loginUrl: `${BASE_URL}`,
      fields: createLoginFields(credentials),
      submitButtonSelector: '#enter',
      postAction: async () => waitForPostLogin(this.page),
      possibleResults: getPossibleLoginResults()
    };
  }

  async fetchData() {
    const defaultStartMoment = (0, _moment.default)().subtract(1, 'years').add(1, 'day');
    const startDate = this.options.startDate || defaultStartMoment.toDate();

    const startMoment = _moment.default.max(defaultStartMoment, (0, _moment.default)(startDate));

    const url = getTransactionsUrl();
    await this.navigateTo(url);
    const accounts = await fetchTransactions(this.page, startMoment);
    return {
      success: true,
      accounts
    };
  }

}

var _default = LeumiScraper;
exports.default = _default;