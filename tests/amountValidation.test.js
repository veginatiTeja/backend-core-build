const test = require("node:test"); //nodejs test runner
const assert = require("node:assert/strict"); // this function compares the actual result and expected result

const isValidPositiveAmount = require("../src/utils/amountValidation");

// test cases
test('accepts a positive number', () => {
    assert.equal(isValidPositiveAmount(100), true);  //fail the test if the actual result, does not match with expected result
});

test('accepts a positive numeric string', () => {
    assert.equal(isValidPositiveAmount('250'), true);
});

test('rejects a zero', () => {
    assert.equal(isValidPositiveAmount(0), false);
});

test('rejects a negative amount', () => {
    assert.equal(isValidPositiveAmount(-50), false);
});

test('rejects an invalid numeric string', () => {
    assert.equal(isValidPositiveAmount('abc'), false);
});

test('rejects empty and whitespace-only strings', () => {
    assert.equal(isValidPositiveAmount(''), false);
    assert.equal(isValidPositiveAmount('   '), false);
});

test('rejects missing and non-infinite numbers', () => {
    assert.equal(isValidPositiveAmount(undefined), false);
    assert.equal(isValidPositiveAmount(null), false);
    assert.equal(isValidPositiveAmount(Infinity), false);
    assert.equal(isValidPositiveAmount(NaN), false);
});
