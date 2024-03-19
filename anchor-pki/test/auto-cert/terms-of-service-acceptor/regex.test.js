const { createRegex, Regex } = require('anchor-pki/auto-cert/terms-of-service-acceptor/regex');
const { assert } = require('#chai-local');

describe('Regex', () => {
    it('should return true for matching regular expression', () => {
        const regex = /^https:\/\/example.com/i;
        const accept = createRegex(regex);
        assert.isTrue(accept('https://example.com/tos'));
    });

    it('should return false for non-matching regular expression', () => {
        const regex = /^https:\/\/example.com/i;
        const accept = createRegex(regex);
        assert.isFalse(accept('https://example.net/'));
    });

    it('stores the regex in a property', () => {
        const regex = /^https:\/\/regex.example.com/i;
        const accept = new Regex(regex);
        assert.equal(accept.regex, regex);
    });
});
