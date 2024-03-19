const { IdentifierPolicy } = require('anchor-pki/auto-cert/identifier-policy');
const { ForHostname } = require('anchor-pki/auto-cert/policy-check/for-hostname');
const { ForWildcardHostname } = require('anchor-pki/auto-cert/policy-check/for-wildcard-hostname');
const { ForIpAddress } = require('anchor-pki/auto-cert/policy-check/for-ip-address');
const IPCIDR = require('ip-cidr');
const { assert } = require('#chai-local');

describe('IdentifierPolicy', () => {
    describe('when validating parameters', () => {
        let policy;

        beforeEach(() => { policy = new IdentifierPolicy('test.example.com'); });

        it('raises an error when non-string is passed to allow', () => {
            assert.throws(() => policy.allow(1), Error, 'identifier must be a string');
        });

        it('raises an error when non-string is passed to deny', () => {
            assert.throws(() => policy.deny(1), Error, 'identifier must be a string');
        });

        it('raises an error when the policy description is not handled', () => {
            assert.throws(() => new IdentifierPolicy(42), Error, "Unable to create a policy check based upon '42'");
        });
    });

    describe('when a checking a Hostname ', () => {
        let policy;

        beforeEach(() => { policy = new IdentifierPolicy('test.example.com'); });

        it('creates a ForHostname check', () => {
            assert.instanceOf(policy.check, ForHostname);
        });

        it('allows exact hostname matches', () => {
            assert.isTrue(policy.allow('test.example.com'));
        });

        it('allows case-insensitive hostname matches', () => {
            assert.isTrue(policy.allow('TEST.example.com'));
        });

        it('denies non-exact hostname matches', () => {
            assert.isTrue(policy.deny('testing.example.com'));
        });
    });

    describe('when checking a wildcard hostname', () => {
        let policy;

        beforeEach(() => { policy = new IdentifierPolicy('*.host.example.com'); });

        it('does not handle non-splat hostnames', () => {
            assert.isFalse(ForWildcardHostname.handles('host.example.com'));
        });

        it('creates a ForWildcardHostname check', () => {
            assert.instanceOf(policy.check, ForWildcardHostname);
        });

        it('allows wildcard matches', () => {
            assert.isTrue(policy.allow('api.host.example.com'));
        });

        it('allows explicit "*" match', () => {
            assert.isTrue(policy.allow('*.host.example.com'));
        });

        it('denies middle wildcard non-matches', () => {
            assert.isTrue(policy.deny('api.*.host.example.com'));
        });

        it('denies after-wildcard exact match', () => {
            assert.isTrue(policy.deny('host.example.com'));
        });

        it('denies dot replacment non-wildcard non-matches', () => {
            assert.isTrue(policy.deny('api.hostDexample.com'));
        });

        it('denies multilevel wildcard non-matches', () => {
            assert.isTrue(policy.deny('1.api.host.example.com'));
        });

        it('denies an invalid hostname prefix', () => {
            assert.isTrue(policy.deny('-invalid.host.example.com'));
        });

        it('denies an non-string parameters', () => {
            assert.throws(() => policy.deny(1), Error, 'identifier must be a string');
        });

        it('policy-check denies a non-string parameter', () => {
            assert.isFalse(policy.check.allow(1));
        });
    });

    describe('with a string CIDR policy description', () => {
        let policy;

        beforeEach(() => { policy = new IdentifierPolicy('192.168.1.1/24'); });

        it('creates a ForIPAddr check', () => {
            assert.instanceOf(policy.check, ForIpAddress);
        });

        it('does not have an ip property', () => {
            assert.strictEqual(policy.check.ip, null);
        });

        it('does have a cidr property', () => {
            assert.isTrue(policy.check.cidr instanceof IPCIDR);
        });

        it('allows ipv4 in-range value', () => {
            assert.isTrue(policy.allow('192.168.1.42'));
        });

        it('denies ipv4 out-of-range value', () => {
            assert.isTrue(policy.deny('192.168.2.42'));
        });

        it('can take an IPCIDR object as a policy description', () => {
            const cidr = new IPCIDR('192.168.1.1/24');
            assert.isTrue(ForIpAddress.handles(cidr));
        });

        it('uses the existing IPCIDR object as the policy description', () => {
            const cidr = new IPCIDR('192.168.1.1/24');
            const cidrPolicy = new IdentifierPolicy(cidr);
            assert.strictEqual(cidrPolicy.check.cidr, cidr);
        });

        it('denies non-string parameter', () => {
            const cidr = new IPCIDR('192.168.1.1/24');
            const forIp = new ForIpAddress(cidr);
            assert.isTrue(forIp.deny(1));
        });
    });

    describe('with a string IP policy description', () => {
        let policy;

        beforeEach(() => { policy = new IdentifierPolicy('192.168.1.42'); });

        it('creates a ForIPAddr check', () => {
            assert.instanceOf(policy.check, ForIpAddress);
        });

        it('has an ip property', () => {
            assert.strictEqual(policy.check.ip, '192.168.1.42');
        });

        it('does not have a cidr property', () => {
            assert.strictEqual(policy.check.cidr, null);
        });

        it('allows ipv4 in-range value', () => {
            assert.isTrue(policy.allow('192.168.1.42'));
        });

        it('denies ipv4 out-of-range value', () => {
            assert.isTrue(policy.deny('192.168.2.42'));
        });

        it('denies non-string parameter', () => {
            const forIp = new ForIpAddress('192.168.1.42');
            assert.isTrue(forIp.deny(1));
        });

        it('denies a non-ip address string', () => {
            assert.isTrue(policy.deny('not an ip address'));
        });
    });

    describe('when building policies', () => {
        describe('with a string', () => {
            const description = 'test.example.com';
            const policies = IdentifierPolicy.build(description);

            it('builds an array of 1 policy', () => {
                assert.strictEqual(policies.length, 1);
            });

            it('the first checks for Hostname', () => {
                assert.instanceOf(policies[0].check, ForHostname);
            });
        });

        describe('with an array of strings', () => {
            const descriptions = ['test.example.com', '*.example.com'];
            const policies = IdentifierPolicy.build(descriptions);

            it('builds an array of policies', () => {
                assert.strictEqual(policies.length, 2);
            });

            it('the first is a check for Hostname', () => {
                assert.instanceOf(policies[0].check, ForHostname);
            });

            it('the 2nd is a check wildcard Hostname', () => {
                assert.instanceOf(policies[1].check, ForWildcardHostname);
            });
        });
    });
});
