const IPCIDR = require('ip-cidr');
const { PolicyCheck } = require('anchor-pki/auto-cert/policy-check');

class ForIpAddress extends PolicyCheck {
    static handles(description) {
        if (typeof description === 'string') {
            return IPCIDR.isValidAddress(description);
        } if (description instanceof IPCIDR) {
            return true;
        }
        return false;
    }

    cidr = null;

    ip = null;

    constructor(description) {
        super(description);
        if (description instanceof IPCIDR) {
            this.cidr = description;
        }
        else if (IPCIDR.isValidCIDR(description)) {
            this.cidr = new IPCIDR(description);
        }
        else {
            this.ip = description;
        }
    }

    allow(name) {
        if (typeof name !== 'string') {
            return false;
        }

        if (this.cidr) {
            return this.cidr.contains(name);
        }

        return (this.ip === name);
    }
}

module.exports = {
    ForIpAddress
};
