const { createV2Route } = require('../../../../platform/api/api-v2-route-factory.js');

module.exports = createV2Route(['sites', { param: 'punycode' }]);
