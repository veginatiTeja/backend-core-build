function isValidPositiveAmount(amount) {
    if(amount === undefined || amount === null) {
        return false;
    }

    if(typeof amount !== 'number' && typeof amount !== 'string') {
        return false;
    }

    if(typeof amount === 'string' && amount.trim() === '') {
        return false;
    }

    const numericAmount = Number(amount);
    return Number.isFinite(numericAmount) && numericAmount > 0;
};

module.exports = isValidPositiveAmount;