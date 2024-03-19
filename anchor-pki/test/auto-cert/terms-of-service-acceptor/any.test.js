const { createAny } = require('anchor-pki/auto-cert/terms-of-service-acceptor/any');
const { assert } = require('#chai-local');

describe('Any', () => {
    it('should always return true', () => {
        const accept = createAny();
        assert.isTrue(accept('tos_uri'));
    });

    it('returns true for null', () => {
        const accept = createAny();
        assert.isTrue(accept(null));
    });
});
