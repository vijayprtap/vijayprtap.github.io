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

        var current = out[key];
        if(Array.isArray(value) && Array.isArray(current) && value.length === current.length) {
            // Same length means the same list, translated - so merge per entry and
            // let each entry fall back per key. Without this, a sparse German
            // overlay of projects.json would replace topics[] wholesale and drop
            // every image, url and article.
            out[key] = value.map(function(item, index) {
                return isPlainObject(item) && isPlainObject(current[index]) ? deepMerge(current[index], item) : item;
            });
            return;
        }
        out[key] = isPlainObject(value) ? deepMerge(current, value) : value;
    });
    return out;
};

module.exports = { deepMerge: deepMerge };