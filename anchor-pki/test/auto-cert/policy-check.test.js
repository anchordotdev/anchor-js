const { PolicyCheck } = require('anchor-pki/auto-cert/policy-check');
const { assert } = require('#chai-local');

describe('PolicyCheck', () => {
    describe('handles', () => {
        it('must be implemented', () => {
            assert.throws(() => PolicyCheck.handles('test'), Error, 'PolicyCheck must implement handles(description)');
        });
    });

    describe('constructor', () => {
        it('sets the policy description', () => {
            const description = 'test';
            const policyCheck = new PolicyCheck(description);

            assert.equal(policyCheck.policyDescription, description);
        });
    });

    describe('deny', () => {
        it('returns the opposite of allow', () => {
            const policyCheck = new PolicyCheck('test');
            policyCheck.allow = (_identifier) => true;

            assert.equal(policyCheck.deny('test'), false);
        });
    });

    describe('allow', () => {
        it('must be implemented', () => {
            const policyCheck = new PolicyCheck('test');

            assert.throws(() => policyCheck.allow(), Error, 'PolicyCheck must implement allow(identifier)');
        });
    });
});
