const { deepMerge } = require('./merge');
module.exports = deepMerge(require('../../_data/projects.json'), require('./de/projects.json'));
