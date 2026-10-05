const { deepMerge } = require('./merge');
module.exports = deepMerge(require('../../_data/service.json'), require('./de/service.json'));
