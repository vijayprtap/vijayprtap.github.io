const { deepMerge } = require('./merge');
module.exports = deepMerge(require('../../_data/home.json'), require('./de/home.json'));
