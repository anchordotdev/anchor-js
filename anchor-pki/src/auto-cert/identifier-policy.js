/* eslint-disable max-classes-per-file */
const { ForHostname } = require('anchor-pki/auto-cert/policy-check/for-hostname');
const { ForWildcardHostname } = require('anchor-pki/auto-cert/policy-check/for-wildcard-hostname');
const { ForIpAddress } = require('anchor-pki/auto-cert/policy-check/for-ip-address');

class UnknownPolicyCheckError extends Error {}

class IdentifierPolicy {
    static policyChecks = [
        ForIpAddress,
        ForHostname,
        ForWildcardHostname
    ];

    static build(policyDescriptions) {
        return Array.isArray(policyDescriptions)
            ? policyDescriptions.map((description) => new IdentifierPolicy(description))
            : [new IdentifierPolicy(policyDescriptions)];
    }

    constructor(description) {
        const checkKlass = IdentifierPolicy.policyChecks.find((klass) => klass.handles(description));
        if (!checkKlass) {
            throw new UnknownPolicyCheckError(`Unable to create a policy check based upon '${description}'`);
        }

        this.description = description;
        this.check = new checkKlass(description); // eslint-disable-line new-cap
    }

    allow(identifier) {
        if (typeof identifier !== 'string') {
            throw new Error('identifier must be a string');
        }

        return this.check.allow(identifier);
    }

    deny(identifier) {
        return !this.allow(identifier);
    }
}

module.exports = {
    UnknownPolicyCheckError,
    IdentifierPolicy
};
/* eslint-enable max-classes-per-file */
