const { PolicyCheck } = require('anchor-pki/auto-cert/policy-check');
const { ForHostname } = require('anchor-pki/auto-cert/policy-check/for-hostname');

class ForWildcardHostname extends PolicyCheck {
    static DOMAIN_LABEL_REGEX = new RegExp(`^${ForHostname.DOMAIN_LABEL}*$`, 'i');

    static SPLAT = '*';

    static handles(description) {
        if (typeof description !== 'string') {
            return false;
        }

        const parts = description.split('.');
        const splat = parts.shift();
        if (splat !== ForWildcardHostname.SPLAT) {
            return false;
        }

        const rest = parts.join('.');
        return ForHostname.handles(rest);
    }

    constructor(description) {
        super(description);
        this.parts = description.split('.');
        this.wildcard = this.parts.shift(); // assumed SPLAT
        this.suffix = this.parts.join('.').toLowerCase();
    }

    allow(hostname) {
        if (typeof hostname !== 'string') {
            return false;
        }

        const parts = hostname.split('.');
        const prefix = parts.shift();
        const domain = parts.join('.').toLowerCase();

        if (!(prefix === ForWildcardHostname.SPLAT || ForWildcardHostname.DOMAIN_LABEL_REGEX.test(prefix))) {
            return false;
        }

        return (domain === this.suffix);
    }
}

module.exports = {
    ForWildcardHostname
};
