#!/usr/bin/env node

const assert = require('node:assert/strict');
const { isAllowedArticleUrl, normalizeItems } = require('./generate-substack-json.js');

const valid = 'https://johnnykao.substack.com/p/legitimate-article';

assert.equal(isAllowedArticleUrl(valid), true);
assert.equal(isAllowedArticleUrl('https://www.linkedin.com/pulse/example'), true);
assert.equal(isAllowedArticleUrl('javascript:alert(1)'), false);
assert.equal(isAllowedArticleUrl('data:text/html,<script>alert(1)</script>'), false);
assert.equal(isAllowedArticleUrl('http://johnnykao.substack.com/p/insecure'), false);
assert.equal(isAllowedArticleUrl('https://evil.example/p/fake'), false);
assert.equal(isAllowedArticleUrl('https://johnnykao.substack.com@evil.example/p/fake'), false);

const normalized = normalizeItems([
  { date: '2026-01-01', title: '<img src=x onerror=alert(1)>Safe', summary: '<script>alert(1)</script>', url: valid },
  { date: '2026-01-02', title: 'Bad URL', summary: 'ignored', url: 'javascript:alert(1)' }
], 5);

assert.equal(normalized.length, 1);
assert.equal(normalized[0].title, 'Safe');
assert.equal(normalized[0].summary, 'alert(1)');
assert.equal(normalized[0].url, valid);
console.log('Security regression tests passed.');
