const { createV2Route } = require('../../../../../api/api-v2-route-factory.js');

module.exports = createV2Route(['names', { param: 'id' }, { param: 'subresource' }]);
