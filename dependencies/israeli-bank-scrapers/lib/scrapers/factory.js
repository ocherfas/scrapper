"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = createScraper;

var _hapoalim = _interopRequireDefault(require("./hapoalim"));

var _otsarHahayal = _interopRequireDefault(require("./otsar-hahayal"));

var _leumi = _interopRequireDefault(require("./leumi"));

var _discount = _interopRequireDefault(require("./discount"));

var _max = _interopRequireDefault(require("./max"));

var _visaCal = _interopRequireDefault(require("./visa-cal"));

var _isracard = _interopRequireDefault(require("./isracard"));

var _amex = _interopRequireDefault(require("./amex"));

var _mizrahi = _interopRequireDefault(require("./mizrahi"));

var _unionBank = _interopRequireDefault(require("./union-bank"));

var _beinleumi = _interopRequireDefault(require("./beinleumi"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function createScraper(options) {
  switch (options.companyId) {
    case 'hapoalim':
      return new _hapoalim.default(options);

    case 'hapoalimBeOnline':
      console.warn("hapoalimBeOnline is deprecated, use 'hapoalim' instead");
      return new _hapoalim.default(options);

    case 'leumi':
      return new _leumi.default(options);

    case 'mizrahi':
      return new _mizrahi.default(options);

    case 'discount':
      return new _discount.default(options);

    case 'otsarHahayal':
      return new _otsarHahayal.default(options);

    case 'visaCal':
      return new _visaCal.default(options);

    case 'leumiCard':
      console.warn("leumiCard is deprecated, use 'max' instead");
      return new _max.default(options);

    case 'max':
      return new _max.default(options);

    case 'isracard':
      return new _isracard.default(options);

    case 'amex':
      return new _amex.default(options);

    case 'union':
      return new _unionBank.default(options);

    case 'beinleumi':
      return new _beinleumi.default(options);

    default:
      throw new Error(`unknown company id ${options.companyId}`);
  }
}