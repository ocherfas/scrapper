"use strict";

require("core-js/modules/es.array.iterator");

require("core-js/modules/es.promise");

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "LOGIN_RESULT", {
  enumerable: true,
  get: function () {
    return _constants.LOGIN_RESULT;
  }
});
exports.BaseScraperWithBrowser = void 0;

var _puppeteer = _interopRequireDefault(require("puppeteer"));

var _baseScraper = require("./base-scraper");

var _constants = require("../constants");

var _navigation = require("../helpers/navigation");

var _elementsInteractions = require("../helpers/elements-interactions");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const VIEWPORT_WIDTH = 1024;
const VIEWPORT_HEIGHT = 768;
const OK_STATUS = 200;

async function getKeyByValue(object, value) {
  const keys = Object.keys(object);

  for (const key of keys) {
    const conditions = object[key];

    for (const condition of conditions) {
      let result = false;

      if (condition instanceof RegExp) {
        result = condition.test(value);
      } else if (typeof condition === 'function') {
        result = await condition();
      } else {
        result = value.toLowerCase() === condition.toLowerCase();
      }

      if (result) {
        return Promise.resolve(key);
      }
    }
  }

  return Promise.resolve(_constants.LOGIN_RESULT.UNKNOWN_ERROR);
}

function handleLoginResult(scraper, loginResult) {
  switch (loginResult) {
    case _constants.LOGIN_RESULT.SUCCESS:
      scraper.emitProgress(_constants.SCRAPE_PROGRESS_TYPES.LOGIN_SUCCESS);
      return {
        success: true
      };

    case _constants.LOGIN_RESULT.INVALID_PASSWORD:
    case _constants.LOGIN_RESULT.UNKNOWN_ERROR:
      scraper.emitProgress(_constants.SCRAPE_PROGRESS_TYPES.LOGIN_FAILED);
      return {
        success: false,
        errorType: loginResult,
        errorMessage: `Login failed with ${loginResult} error`
      };

    case _constants.LOGIN_RESULT.CHANGE_PASSWORD:
      scraper.emitProgress(_constants.SCRAPE_PROGRESS_TYPES.CHANGE_PASSWORD);
      return {
        success: false,
        errorType: loginResult
      };

    default:
      throw new Error(`unexpected login result "${loginResult}"`);
  }
}

function createGeneralError() {
  return {
    success: false,
    errorType: _constants.GENERAL_ERROR
  };
}

class BaseScraperWithBrowser extends _baseScraper.BaseScraper {
  async initialize() {
    this.emitProgress(_constants.SCRAPE_PROGRESS_TYPES.INITIALIZING);
    let env = null;

    if (this.options.verbose) {
      env = _objectSpread({
        DEBUG: '*'
      }, process.env);
    }

    if (typeof this.options.browser !== 'undefined' && this.options.browser !== null) {
      this.browser = this.options.browser;
    } else {
      const executablePath = this.options.executablePath || undefined;
      this.browser = await _puppeteer.default.launch({
        env,
        headless: !this.options.showBrowser,
        executablePath
      });
    }

    const pages = await this.browser.pages();

    if (pages.length) {
      [this.page] = pages;
    } else {
      this.page = await this.browser.newPage();
    }

    await this.page.setViewport({
      width: VIEWPORT_WIDTH,
      height: VIEWPORT_HEIGHT
    });
  }

  async navigateTo(url, page) {
    const pageToUse = page || this.page;
    const response = await pageToUse.goto(url); // note: response will be null when navigating to same url while changing the hash part. the condition below will always accept null as valid result.

    if (response !== null && (response === undefined || response.status() !== OK_STATUS)) {
      throw new Error(`Error while trying to navigate to url ${url}`);
    }
  }

  getLoginOptions() {
    throw new Error(`getLoginOptions() is not created in ${this.options.companyId}`);
  }

  async fillInputs(fields) {
    const modified = [...fields];
    const input = modified.shift();
    await (0, _elementsInteractions.fillInput)(this.page, input.selector, input.value);

    if (modified.length) {
      return this.fillInputs(modified);
    }

    return null;
  }

  async login(credentials) {
    if (!credentials) {
      return createGeneralError();
    }

    const loginOptions = this.getLoginOptions(credentials);
    await this.navigateTo(loginOptions.loginUrl);

    if (loginOptions.checkReadiness) {
      await loginOptions.checkReadiness();
    } else {
      await (0, _elementsInteractions.waitUntilElementFound)(this.page, loginOptions.submitButtonSelector);
    }

    if (loginOptions.preAction) {
      await loginOptions.preAction();
    }

    await this.fillInputs(loginOptions.fields);
    await (0, _elementsInteractions.clickButton)(this.page, loginOptions.submitButtonSelector);
    this.emitProgress(_constants.SCRAPE_PROGRESS_TYPES.LOGGING_IN);

    if (loginOptions.postAction) {
      await loginOptions.postAction();
    } else {
      await (0, _navigation.waitForNavigation)(this.page);
    }

    const current = await (0, _navigation.getCurrentUrl)(this.page, true);
    const loginResult = await getKeyByValue(loginOptions.possibleResults, current);
    return handleLoginResult(this, loginResult);
  }

  async terminate() {
    this.emitProgress(_constants.SCRAPE_PROGRESS_TYPES.TERMINATING);
    await this.browser.close();
  }

}

exports.BaseScraperWithBrowser = BaseScraperWithBrowser;