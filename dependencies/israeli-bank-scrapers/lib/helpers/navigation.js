"use strict";

require("core-js/modules/es.promise");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.waitForNavigation = waitForNavigation;
exports.waitForNavigationAndDomLoad = waitForNavigationAndDomLoad;
exports.getCurrentUrl = getCurrentUrl;
exports.waitForRedirect = waitForRedirect;

var _waiting = _interopRequireDefault(require("./waiting"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

async function waitForNavigation(page, options) {
  await page.waitForNavigation(options);
}

async function waitForNavigationAndDomLoad(page) {
  await waitForNavigation(page, {
    waitUntil: 'domcontentloaded'
  });
}

async function getCurrentUrl(page, clientSide = false) {
  if (clientSide) {
    return page.evaluate(() => window.location.href);
  }

  return page.url();
}

async function waitForRedirect(page, timeout = 20000, clientSide = false, ignoreList = []) {
  const initial = await getCurrentUrl(page, clientSide);

  try {
    await (0, _waiting.default)(async () => {
      const current = await getCurrentUrl(page, clientSide);
      return current !== initial && !ignoreList.includes(current);
    }, `waiting for redirect from ${initial}`, timeout, 1000);
  } catch (e) {
    if (e && e.timeout) {
      const current = await getCurrentUrl(page, clientSide);
      e.lastUrl = current;
    }

    throw e;
  }
}