"use strict";

require("core-js/modules/es.promise");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _moment = _interopRequireDefault(require("moment"));

var _v = _interopRequireDefault(require("uuid/v4"));

var _baseScraperWithBrowser = require("./base-scraper-with-browser");

var _navigation = require("../helpers/navigation");

var _waiting = _interopRequireDefault(require("../helpers/waiting"));

var _constants = require("../constants");

var _fetch = require("../helpers/fetch");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const DATE_FORMAT = 'YYYYMMDD';

function convertTransactions(txns) {
  return txns.map(txn => {
    const isOutbound = txn.eventActivityTypeCode === 2;
    let memo = null;

    if (txn.beneficiaryDetailsData) {
      const {
        partyHeadline,
        partyName,
        messageHeadline,
        messageDetail
      } = txn.beneficiaryDetailsData;
      const memoLines = [];

      if (partyHeadline) {
        memoLines.push(partyHeadline);
      }

      if (partyName) {
        memoLines.push(`${partyName}.`);
      }

      if (messageHeadline) {
        memoLines.push(messageHeadline);
      }

      if (messageDetail) {
        memoLines.push(`${messageDetail}.`);
      }

      if (memoLines.length) {
        memo = memoLines.join(' ');
      }
    }

    return {
      type: _constants.NORMAL_TXN_TYPE,
      identifier: txn.referenceNumber,
      date: (0, _moment.default)(txn.eventDate, DATE_FORMAT).toISOString(),
      processedDate: (0, _moment.default)(txn.valueDate, DATE_FORMAT).toISOString(),
      originalAmount: isOutbound ? -txn.eventAmount : txn.eventAmount,
      originalCurrency: 'ILS',
      chargedAmount: isOutbound ? -txn.eventAmount : txn.eventAmount,
      description: txn.activityDescription,
      status: txn.serialNumber === 0 ? _constants.TRANSACTION_STATUS.PENDING : _constants.TRANSACTION_STATUS.COMPLETED,
      memo
    };
  });
}

async function getRestContext(page) {
  await (0, _waiting.default)(async () => {
    return page.evaluate(() => !!window.bnhpApp);
  }, 'waiting for app data load');
  const result = await page.evaluate(() => {
    return window.bnhpApp.restContext;
  });
  return result.slice(1);
}

async function fetchPoalimXSRFWithinPage(page, url, pageUuid) {
  const cookies = await page.cookies();
  const XSRFCookie = cookies.find(cookie => cookie.name === 'XSRF-TOKEN');
  const headers = {};

  if (XSRFCookie != null) {
    headers['X-XSRF-TOKEN'] = XSRFCookie.value;
  }

  headers.pageUuid = pageUuid;
  headers.uuid = (0, _v.default)();
  headers['Content-Type'] = 'application/json;charset=UTF-8';
  return (0, _fetch.fetchPostWithinPage)(page, url, [], headers);
}

async function fetchAccountData(page, baseUrl, options) {
  const restContext = await getRestContext(page);
  const apiSiteUrl = `${baseUrl}/${restContext}`;
  const accountDataUrl = `${baseUrl}/ServerServices/general/accounts`;
  const accountsInfo = await (0, _fetch.fetchGetWithinPage)(page, accountDataUrl);
  const defaultStartMoment = (0, _moment.default)().subtract(1, 'years').add(1, 'day');
  const startDate = options.startDate || defaultStartMoment.toDate();

  const startMoment = _moment.default.max(defaultStartMoment, (0, _moment.default)(startDate));

  const startDateStr = startMoment.format(DATE_FORMAT);
  const endDateStr = (0, _moment.default)().format(DATE_FORMAT);
  const accounts = [];

  for (let accountIndex = 0; accountIndex < accountsInfo.length; accountIndex += 1) {
    const accountNumber = `${accountsInfo[accountIndex].bankNumber}-${accountsInfo[accountIndex].branchNumber}-${accountsInfo[accountIndex].accountNumber}`;
    const txnsUrl = `${apiSiteUrl}/current-account/transactions?accountId=${accountNumber}&numItemsPerPage=150&retrievalEndDate=${endDateStr}&retrievalStartDate=${startDateStr}&sortCode=1`;
    const txnsResult = await fetchPoalimXSRFWithinPage(page, txnsUrl, '/current-account/transactions');
    let txns = [];

    if (txnsResult) {
      txns = convertTransactions(txnsResult.transactions);
    }

    accounts.push({
      accountNumber,
      txns
    });
  }

  const accountData = {
    success: true,
    accounts
  };
  return accountData;
}

function getPossibleLoginResults(baseUrl) {
  const urls = {};
  urls[_baseScraperWithBrowser.LOGIN_RESULT.SUCCESS] = [`${baseUrl}/portalserver/HomePage`, `${baseUrl}/ng-portals-bt/rb/he/homepage`, `${baseUrl}/ng-portals/rb/he/homepage`];
  urls[_baseScraperWithBrowser.LOGIN_RESULT.INVALID_PASSWORD] = [`${baseUrl}/AUTHENTICATE/LOGON?flow=AUTHENTICATE&state=LOGON&errorcode=1.6&callme=false`];
  urls[_baseScraperWithBrowser.LOGIN_RESULT.CHANGE_PASSWORD] = [`${baseUrl}/MCP/START?flow=MCP&state=START&expiredDate=null`, /\/ABOUTTOEXPIRE\/START/i];
  return urls;
}

function createLoginFields(credentials) {
  return [{
    selector: '#userCode',
    value: credentials.userCode
  }, {
    selector: '#password',
    value: credentials.password
  }];
}

class HapoalimScraper extends _baseScraperWithBrowser.BaseScraperWithBrowser {
  // eslint-disable-next-line class-methods-use-this
  get baseUrl() {
    return 'https://login.bankhapoalim.co.il';
  }

  getLoginOptions(credentials) {
    return {
      loginUrl: `${this.baseUrl}/cgi-bin/poalwwwc?reqName=getLogonPage`,
      fields: createLoginFields(credentials),
      submitButtonSelector: '.login-btn',
      postAction: async () => (0, _navigation.waitForRedirect)(this.page),
      possibleResults: getPossibleLoginResults(this.baseUrl)
    };
  }

  async fetchData() {
    return fetchAccountData(this.page, this.baseUrl, this.options, msg => this.notify(msg));
  }

}

var _default = HapoalimScraper;
exports.default = _default;