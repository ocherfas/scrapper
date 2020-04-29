"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _baseIsracardAmex = _interopRequireDefault(require("./base-isracard-amex"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const BASE_URL = 'https://he.americanexpress.co.il';
const COMPANY_CODE = '77';

class AmexScraper extends _baseIsracardAmex.default {
  constructor(options) {
    super(options, BASE_URL, COMPANY_CODE);
  }

}

var _default = AmexScraper;
exports.default = _default;