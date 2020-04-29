"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = getAllMonthMoments;

var _moment = _interopRequireDefault(require("moment"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function getAllMonthMoments(startMoment, includeNext) {
  let monthMoment = (0, _moment.default)(startMoment).startOf('month');
  const allMonths = [];
  let lastMonth = (0, _moment.default)().startOf('month');

  if (includeNext) {
    lastMonth = lastMonth.add(1, 'month');
  }

  while (monthMoment.isSameOrBefore(lastMonth)) {
    allMonths.push(monthMoment);
    monthMoment = (0, _moment.default)(monthMoment).add(1, 'month');
  }

  return allMonths;
}