var root = this;
if ('undefined' !== typeof exports) {
    if ('undefined' !== typeof module && module.exports) {
        exports = module.exports = FBP;
    }
    exports.FBP = FBP;
} else {
    root.FBP = FBP;
}
