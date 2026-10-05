const { deepMerge } = require('./merge');
module.exports = deepMerge(require('../../_data/skill.json'), require('./de/skill.json'));
