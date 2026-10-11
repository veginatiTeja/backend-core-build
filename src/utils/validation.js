
function isPositiveFiniteNumber(value) {
    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {
        return false;
    }

    const number = Number(value);

    return Number.isFinite(number) && number > 0;
}

function isPositiveInteger(value) {
    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {
        return false;
    }

    const number = Number(value);

    return Number.isSafeInteger(number) && number > 0;
}

module.exports = {
    isPositiveFiniteNumber,
    isPositiveInteger
};
