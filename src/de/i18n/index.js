// German content, keyed by the same dataset names the templates already use.
//
// This bundle is exposed to templates as the Nunjucks global `deData` (see
// .eleventy.js) rather than as Eleventy *data*.
//
// It was originally supplied as Eleventy directory data via src/de/de.11tydata.js.
// That was wrong: Eleventy 2.0 deep-merges directory data with global data, and
// its merge concatenates arrays (src/Util/Merge.js -> target.concat(source)).
// Because each entry here is the COMPLETE merged object, every array in it
// collided with the same array in src/_data/*.json and was duplicated:
// 3 coffee cards became 6, 8 CV entries became 16, 6 topics became 12.
// Routing around the data cascade removes that failure mode by construction.
const names = ['about', 'contact', 'coffee', 'home', 'portfolio', 'projects', 'resume', 'service', 'skill'];

module.exports = names.reduce(function(data, name) {
    data[name] = require('./' + name);
    return data;
}, {});
