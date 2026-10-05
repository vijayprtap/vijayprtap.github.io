const { deepMerge } = require('./merge');
module.exports = deepMerge(require('../../_data/contact.json'), require('./de/contact.json'));
