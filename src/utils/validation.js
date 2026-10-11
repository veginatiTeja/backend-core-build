const MAX_AMOUNT = 99999999.99;

function isPositiveFiniteNumber(value) {
    if (typeof value !== "number" && typeof value !== "string") {
        return false;
    }

    const text = String(value);

    // Accept only ordinary decimal amounts with at most 2 decimal places.
    if (!/^\d+(?:\.\d{1,2})?$/.test(text)) {
        return false;
    }

    const number = Number(text);

    return (
        Number.isFinite(number) &&
        number > 0 &&
        number <= MAX_AMOUNT
    );
}

function isPositiveInteger(value) {
    if (typeof value !== "number" && typeof value !== "string") {
        return false;
    }

    const text = String(value);

    // IDs must contain digits only; reject decimals and scientific notation.
    if (!/^\d+$/.test(text)) {
        return false;
    }

    const number = Number(text);

    return Number.isSafeInteger(number) && number > 0;
}

module.exports = {
    isPositiveFiniteNumber,
    isPositiveInteger
};
