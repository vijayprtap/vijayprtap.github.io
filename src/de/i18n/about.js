const { deepMerge } = require('./merge');
module.exports = deepMerge(require('../../_data/about.json'), require('./de/about.json'));
