const { deepMerge } = require('./merge');
module.exports = deepMerge(require('../../_data/coffee.json'), require('./de/coffee.json'));
