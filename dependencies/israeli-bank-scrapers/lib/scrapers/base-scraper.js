"use strict";

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
exports.BaseScraper = void 0;

var _events = require("events");

var _constants = require("../constants");

const SCRAPE_PROGRESS = 'SCRAPE_PROGRESS';

function createErrorResult(errorType, errorMessage) {
  return {
    success: false,
    errorType,
    errorMessage
  };
}

function createTimeoutError(errorMessage) {
  return createErrorResult(_constants.ERRORS.TIMEOUT, errorMessage);
}

function createGenericError(errorMessage) {
  return createErrorResult(_constants.ERRORS.GENERIC, errorMessage);
}

class BaseScraper {
  constructor(options) {
    this.options = options;
    this.eventEmitter = new _events.EventEmitter();
  }

  async initialize() {
    this.emitProgress(_constants.SCRAPE_PROGRESS_TYPES.INITIALIZING);
  }

  async scrape(credentials) {
    this.emitProgress(_constants.SCRAPE_PROGRESS_TYPES.START_SCRAPING);
    await this.initialize();
    let loginResult;

    try {
      loginResult = await this.login(credentials);
    } catch (e) {
      loginResult = e.timeout ? createTimeoutError(e.message) : createGenericError(e.message);
    }

    let scrapeResult;

    if (loginResult.success) {
      try {
        scrapeResult = await this.fetchData();
      } catch (e) {
        scrapeResult = e.timeout ? createTimeoutError(e.message) : createGenericError(e.message);
      }
    } else {
      scrapeResult = loginResult;
    }

    try {
      await this.terminate();
    } catch (e) {
      scrapeResult = createGenericError(e.message);
    }

    this.emitProgress(_constants.SCRAPE_PROGRESS_TYPES.END_SCRAPING);
    return scrapeResult;
  }

  async login() {
    throw new Error(`login() is not created in ${this.options.companyId}`);
  }

  async fetchData() {
    throw new Error(`fetchData() is not created in ${this.options.companyId}`);
  }

  async terminate() {
    this.emitProgress(_constants.SCRAPE_PROGRESS_TYPES.TERMINATING);
  }

  emitProgress(type) {
    this.emit(SCRAPE_PROGRESS, {
      type
    });
  }

  emit(eventName, payload) {
    this.eventEmitter.emit(eventName, this.options.companyId, payload);
  }

  onProgress(func) {
    this.eventEmitter.on(SCRAPE_PROGRESS, func);
  }

}

exports.BaseScraper = BaseScraper;