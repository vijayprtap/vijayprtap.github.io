// Per-key fallback for translations. `base` is the complete English data file and
// `overlay` is a sparse German file that only carries translated strings, so any
// key the overlay omits is served from base. Arrays and primitives replace
// wholesale rather than merging element-wise - a translated list is a different
// list, not a patch.
var isPlainObject = function(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
};

var deepMerge = function(base, overlay) {
    if(!isPlainObject(base)) { return overlay; }
    if(!isPlainObject(overlay)) { return overlay; }

    var out = Object.assign({}, base);
    Object.keys(overlay).forEach(function(key) {
        var value = overlay[key];
        // An explicitly undefined value is a stale overlay key, not a deletion.
        if(typeof value === 'undefined') { return; }
        // An overlay is a translation of existing copy, not a place to add new
        // keys, so a key missing from base is a typo and is dropped rather than
        // silently injected. Task 5 asserts every German key exists in English.
        if(!Object.prototype.hasOwnProperty.call(base, key)) { return; }
        out[key] = isPlainObject(value) ? deepMerge(out[key], value) : value;
    });
    return out;
};

module.exports = { deepMerge: deepMerge };