const { PolicyCheck } = require('anchor-pki/auto-cert/policy-check');

class ForHostname extends PolicyCheck {
    static ALPHA = '[a-zA-Z]';

    static ALPHA_NUMERIC = '[a-zA-Z0-9]';

    static ALPHA_NUMERIC_HYPHEN = '[-a-zA-Z0-9]';

    static DOMAIN_LABEL = `${ForHostname.ALPHA_NUMERIC}${ForHostname.ALPHA_NUMERIC_HYPHEN}*${ForHostname.ALPHA_NUMERIC}`;

    static TOP_LEVEL_DOMAIN = `${ForHostname.ALPHA}${ForHostname.ALPHA_NUMERIC_HYPHEN}*${ForHostname.ALPHA_NUMERIC}`;

    static REGEX = new RegExp(
        `^${ForHostname.DOMAIN_LABEL}(\\.${ForHostname.DOMAIN_LABEL})*\\.${ForHostname.TOP_LEVEL_DOMAIN}$`,
        'i'
    );

    static handles(description) {
        return typeof description === 'string' && ForHostname.REGEX.test(description);
    }

    constructor(description) {
        super(description);
        this.hostname = description.toLowerCase();
    }

    allow(name) {
        return typeof name === 'string' && name.toLowerCase() === this.hostname;
    }
}

module.exports = {
    ForHostname
};
