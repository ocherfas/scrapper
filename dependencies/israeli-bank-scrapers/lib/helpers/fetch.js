"use strict";

require("core-js/modules/es.promise");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fetchGet = fetchGet;
exports.fetchPost = fetchPost;
exports.fetchGetWithinPage = fetchGetWithinPage;
exports.fetchPostWithinPage = fetchPostWithinPage;

var _nodeFetch = _interopRequireDefault(require("node-fetch"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const JSON_CONTENT_TYPE = 'application/json';

function getJsonHeaders() {
  return {
    Accept: JSON_CONTENT_TYPE,
    'Content-Type': JSON_CONTENT_TYPE
  };
}

async function fetchGet(url, extraHeaders) {
  let headers = getJsonHeaders();

  if (extraHeaders) {
    headers = Object.assign(headers, extraHeaders);
  }

  const request = {
    method: 'GET',
    headers
  };
  const result = await (0, _nodeFetch.default)(url, request);
  return result.json();
}

async function fetchPost(url, data, extraHeaders) {
  let headers = getJsonHeaders();

  if (extraHeaders) {
    headers = Object.assign(headers, extraHeaders);
  }

  const request = {
    method: 'POST',
    headers,
    body: JSON.stringify(data)
  };
  const result = await (0, _nodeFetch.default)(url, request);
  return result.json();
}

async function fetchGetWithinPage(page, url) {
  return page.evaluate(url => {
    return new Promise((resolve, reject) => {
      fetch(url, {
        credentials: 'include'
      }).then(result => {
        if (result.status === 204) {
          resolve(null);
        } else {
          resolve(result.json());
        }
      }).catch(e => {
        reject(e);
      });
    });
  }, url);
}

async function fetchPostWithinPage(page, url, data, extraHeaders = {}) {
  return page.evaluate((url, data, extraHeaders) => {
    return new Promise((resolve, reject) => {
      fetch(url, {
        method: 'POST',
        body: JSON.stringify(data),
        credentials: 'include',
        // eslint-disable-next-line prefer-object-spread
        headers: Object.assign({
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
        }, extraHeaders)
      }).then(result => {
        if (result.status === 204) {
          // No content response
          resolve(null);
        } else {
          resolve(result.json());
        }
      }).catch(e => {
        reject(e);
      });
    });
  }, url, data, extraHeaders);
}