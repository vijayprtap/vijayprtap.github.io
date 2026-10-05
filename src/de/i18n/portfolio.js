const { deepMerge } = require('./merge');
module.exports = deepMerge(require('../../_data/portfolio.json'), require('./de/portfolio.json'));
