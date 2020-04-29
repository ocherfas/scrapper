"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ISO_DATE_REGEX = exports.ISO_DATE_FORMAT = exports.TRANSACTION_STATUS = exports.GENERAL_ERROR = exports.ERRORS = exports.LOGIN_RESULT = exports.SCRAPE_PROGRESS_TYPES = exports.DOLLAR_CURRENCY = exports.DOLLAR_CURRENCY_SYMBOL = exports.SHEKEL_CURRENCY = exports.ALT_SHEKEL_CURRENCY = exports.SHEKEL_CURRENCY_KEYWORD = exports.SHEKEL_CURRENCY_SYMBOL = exports.INSTALLMENTS_TXN_TYPE = exports.NORMAL_TXN_TYPE = void 0;
const NORMAL_TXN_TYPE = 'normal';
exports.NORMAL_TXN_TYPE = NORMAL_TXN_TYPE;
const INSTALLMENTS_TXN_TYPE = 'installments';
exports.INSTALLMENTS_TXN_TYPE = INSTALLMENTS_TXN_TYPE;
const SHEKEL_CURRENCY_SYMBOL = '₪';
exports.SHEKEL_CURRENCY_SYMBOL = SHEKEL_CURRENCY_SYMBOL;
const SHEKEL_CURRENCY_KEYWORD = 'ש"ח';
exports.SHEKEL_CURRENCY_KEYWORD = SHEKEL_CURRENCY_KEYWORD;
const ALT_SHEKEL_CURRENCY = 'NIS';
exports.ALT_SHEKEL_CURRENCY = ALT_SHEKEL_CURRENCY;
const SHEKEL_CURRENCY = 'ILS';
exports.SHEKEL_CURRENCY = SHEKEL_CURRENCY;
const DOLLAR_CURRENCY_SYMBOL = '$';
exports.DOLLAR_CURRENCY_SYMBOL = DOLLAR_CURRENCY_SYMBOL;
const DOLLAR_CURRENCY = 'USD';
exports.DOLLAR_CURRENCY = DOLLAR_CURRENCY;
const SCRAPE_PROGRESS_TYPES = {
  INITIALIZING: 'INITIALIZING',
  START_SCRAPING: 'START_SCRAPING',
  LOGGING_IN: 'LOGGING_IN',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILED: 'LOGIN_FAILED',
  CHANGE_PASSWORD: 'CHANGE_PASSWORD',
  END_SCRAPING: 'END_SCRAPING',
  TERMINATING: 'TERMINATING'
};
exports.SCRAPE_PROGRESS_TYPES = SCRAPE_PROGRESS_TYPES;
const LOGIN_RESULT = {
  SUCCESS: 'SUCCESS',
  INVALID_PASSWORD: 'INVALID_PASSWORD',
  CHANGE_PASSWORD: 'CHANGE_PASSWORD',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};
exports.LOGIN_RESULT = LOGIN_RESULT;
const ERRORS = {
  TIMEOUT: 'TIMEOUT',
  GENERIC: 'GENERIC'
};
exports.ERRORS = ERRORS;
const GENERAL_ERROR = 'GENERAL_ERROR';
exports.GENERAL_ERROR = GENERAL_ERROR;
const TRANSACTION_STATUS = {
  COMPLETED: 'completed',
  PENDING: 'pending'
};
exports.TRANSACTION_STATUS = TRANSACTION_STATUS;
const ISO_DATE_FORMAT = 'YYYY-MM-DD[T]HH:mm:ss.SSS[Z]';
exports.ISO_DATE_FORMAT = ISO_DATE_FORMAT;
const ISO_DATE_REGEX = /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])T([0-1][0-9]|2[0-3])(:[0-5][0-9]){2}\.[0-9]{3}Z$/;
exports.ISO_DATE_REGEX = ISO_DATE_REGEX;