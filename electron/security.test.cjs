const { test } = require('node:test');
const assert = require('node:assert/strict');
const { APP_CSP_HEADER, isAppOriginUrl, applyAppCspHeaders } = require('./security.cjs');

test('isAppOriginUrl matches only packaged app origin or local dev server', () => {
  assert.equal(isAppOriginUrl('photomap://app/index.html', true), true);
  assert.equal(isAppOriginUrl('photomap://app/assets/main.js', false), true);
  assert.equal(isAppOriginUrl('http://localhost:3000/', false), true);
  assert.equal(isAppOriginUrl('http://127.0.0.1:3000/index.html', false), true);

  assert.equal(isAppOriginUrl('http://localhost:3000/', true), false);
  assert.equal(isAppOriginUrl('photomap://other/index.html', true), false);
  assert.equal(isAppOriginUrl('https://github.com/login', true), false);
  assert.equal(isAppOriginUrl('https://github.githubassets.com/assets/app.css', true), false);
  assert.equal(isAppOriginUrl('https://photomap.satula.top/api/v1/auth/github', true), false);
  assert.equal(isAppOriginUrl('not-a-url', true), false);
});

test('applyAppCspHeaders injects CSP only on PhotoMap app origins and leaves GitHub untouched', () => {
  const originalHeaders = { 'Content-Type': ['text/html; charset=utf-8'] };
  const appResult = applyAppCspHeaders(
    { url: 'photomap://app/index.html', responseHeaders: originalHeaders },
    true
  );
  assert.equal(appResult['Content-Type'][0], 'text/html; charset=utf-8');
  assert.deepEqual(appResult['Content-Security-Policy'], [APP_CSP_HEADER]);

  const githubHeaders = {
    'Content-Type': ['text/html; charset=utf-8'],
    'Content-Security-Policy': ["default-src 'none'; style-src github.githubassets.com"],
  };
  const githubResult = applyAppCspHeaders(
    { url: 'https://github.com/login', responseHeaders: githubHeaders },
    true
  );
  assert.equal(githubResult, githubHeaders);

  const githubAssetHeaders = { 'Content-Type': ['text/css'] };
  const githubAssetResult = applyAppCspHeaders(
    { url: 'https://github.githubassets.com/assets/app.css', responseHeaders: githubAssetHeaders },
    false
  );
  assert.equal(githubAssetResult['Content-Security-Policy'], undefined);
  assert.equal(githubAssetResult, githubAssetHeaders);
});
