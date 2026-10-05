const { deepMerge } = require('./merge');
module.exports = deepMerge(require('../../_data/resume.json'), require('./de/resume.json'));
