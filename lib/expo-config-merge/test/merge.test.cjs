const { test } = require('node:test');
const assert = require('node:assert/strict');
const merge = require('..');

test('merges Expo configuration and plugin options without mutating inputs', () => {
  const target = {
    name: 'Stillwell',
    ios: { supportsTablet: true, infoPlist: { first: 'value' } },
    plugins: ['existing-plugin'],
  };
  const source = {
    ios: { infoPlist: { second: 'value' } },
    plugins: [['new-plugin', { enabled: true }]],
  };
  const before = structuredClone({ target, source });
  const result = merge(target, source);
  assert.deepEqual(result, {
    name: 'Stillwell',
    ios: { supportsTablet: true, infoPlist: { first: 'value', second: 'value' } },
    plugins: ['existing-plugin', ['new-plugin', { enabled: true }]],
  });
  result.ios.infoPlist.first = 'changed';
  result.plugins[1][1].enabled = false;
  assert.deepEqual({ target, source }, before);
});

test('preserves replacement values and enumerable symbols', () => {
  const symbol = Symbol('config');
  const result = merge(
    { flag: true, optional: 'old', entries: [1], [symbol]: { first: 1 } },
    { flag: false, optional: null, entries: 'replacement', [symbol]: { second: 2 } },
  );
  assert.equal(result.flag, false);
  assert.equal(result.optional, null);
  assert.equal(result.entries, 'replacement');
  assert.deepEqual(result[symbol], { first: 1, second: 2 });
});

test('does not poison the result or global prototypes through nested JSON', () => {
  const malicious = JSON.parse(
    '{"__proto__":{"polluted":true},"nested":{"__proto__":{"polluted":true}},"constructor":{"prototype":{"polluted":true}}}',
  );
  const result = merge({ nested: { safe: true } }, malicious);
  assert.equal(result.polluted, undefined);
  assert.equal(result.nested.polluted, undefined);
  assert.equal(result.nested.safe, true);
  assert.equal({}.polluted, undefined);
  assert.equal(Object.getPrototypeOf(result), Object.prototype);
  assert.equal(Object.getPrototypeOf(result.nested), Object.prototype);
});
