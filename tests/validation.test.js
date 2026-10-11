const test = require("node:test");
const assert = require("node:assert/strict");

const {
    isPositiveFiniteNumber,
    isPositiveInteger
} = require("../src/utils/validation");

test("accepts valid positive amounts with at most two decimal places", () => {
    assert.equal(isPositiveFiniteNumber(10), true);
    assert.equal(isPositiveFiniteNumber("25.50"), true);
    assert.equal(isPositiveFiniteNumber("0.01"), true);
    assert.equal(isPositiveFiniteNumber("99999999.99"), true);
});

test("rejects invalid amount values", () => {
    assert.equal(isPositiveFiniteNumber(0), false);
    assert.equal(isPositiveFiniteNumber(-5), false);
    assert.equal(isPositiveFiniteNumber(""), false);
    assert.equal(isPositiveFiniteNumber("abc"), false);
    assert.equal(isPositiveFiniteNumber(Infinity), false);
    assert.equal(isPositiveFiniteNumber("Infinity"), false);
    assert.equal(isPositiveFiniteNumber(null), false);
    assert.equal(isPositiveFiniteNumber(undefined), false);
});

test("rejects amounts with more than two decimal places", () => {
    assert.equal(isPositiveFiniteNumber("0.005"), false);
    assert.equal(isPositiveFiniteNumber("10.255"), false);
    assert.equal(isPositiveFiniteNumber(0.004), false);
});

test("rejects amounts exceeding the database decimal limit", () => {
    assert.equal(isPositiveFiniteNumber("100000000"), false);
    assert.equal(isPositiveFiniteNumber("1000000000"), false);
});

test("rejects unexpected amount input types and formats", () => {
    assert.equal(isPositiveFiniteNumber(true), false);
    assert.equal(isPositiveFiniteNumber([5]), false);
    assert.equal(isPositiveFiniteNumber("0x1A"), false);
    assert.equal(isPositiveFiniteNumber("1e3"), false);
    assert.equal(isPositiveFiniteNumber(" 10 "), false);
});

test("accepts positive integer user IDs", () => {
    assert.equal(isPositiveInteger(1), true);
    assert.equal(isPositiveInteger("2"), true);
    assert.equal(isPositiveInteger("1000"), true);
});

test("rejects invalid user IDs", () => {
    assert.equal(isPositiveInteger(0), false);
    assert.equal(isPositiveInteger(-1), false);
    assert.equal(isPositiveInteger(1.5), false);
    assert.equal(isPositiveInteger("abc"), false);
    assert.equal(isPositiveInteger(Infinity), false);
    assert.equal(isPositiveInteger(null), false);
    assert.equal(isPositiveInteger(undefined), false);
    assert.equal(isPositiveInteger(""), false);
    assert.equal(isPositiveInteger("1e3"), false);
    assert.equal(isPositiveInteger("0x1A"), false);
    assert.equal(isPositiveInteger(Number.MAX_SAFE_INTEGER + 1), false);
});
