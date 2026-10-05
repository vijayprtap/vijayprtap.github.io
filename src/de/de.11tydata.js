// Eleventy directory data for every template under src/de/.
//
// Eleventy 2.0 does NOT read nested _data directories: for a template in
// src/de/, directory data must be a file named after the directory in that same
// directory (src/de/de.js). Global data (src/_data) is the only _data Eleventy
// honours, and it is not per-directory. Each entry below is the complete English
// data file deep-merged with its sparse German overlay, so any key the overlay
// omits renders in English.
const names = ['about', 'contact', 'coffee', 'home', 'portfolio', 'projects', 'resume', 'service', 'skill'];

module.exports = names.reduce(function(data, name) {
    data[name] = require('./i18n/' + name);
    return data;
}, {});