
const test = require("node:test");
const assert = require("node:assert/strict");

const {
    isPositiveFiniteNumber,
    isPositiveInteger
} = require("../src/utils/validation");

test("accepts positive finite amounts", () => {
    assert.equal(isPositiveFiniteNumber(10), true);
    assert.equal(isPositiveFiniteNumber("25.50"), true);
});

test("rejects invalid amounts", () => {
    assert.equal(isPositiveFiniteNumber(0), false);
    assert.equal(isPositiveFiniteNumber(-5), false);
    assert.equal(isPositiveFiniteNumber(""), false);
    assert.equal(isPositiveFiniteNumber("abc"), false);
    assert.equal(isPositiveFiniteNumber(Infinity), false);
    assert.equal(isPositiveFiniteNumber("Infinity"), false);
});

test("accepts positive integer user IDs", () => {
    assert.equal(isPositiveInteger(1), true);
    assert.equal(isPositiveInteger("2"), true);
});

test("rejects invalid user IDs", () => {
    assert.equal(isPositiveInteger(0), false);
    assert.equal(isPositiveInteger(-1), false);
    assert.equal(isPositiveInteger(1.5), false);
    assert.equal(isPositiveInteger("abc"), false);
    assert.equal(isPositiveInteger(Infinity), false);
});
