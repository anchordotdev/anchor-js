/**
 * auto-cert
 */

const { createSNICallback } = require('anchor-pki/auto-cert/sni-callback');
const { TermsOfServiceAcceptor } = require('anchor-pki/auto-cert/terms-of-service-acceptor');

function autoCert(opts = {}) {
    if (!opts.name) {
        opts.name = 'auto-cert';
    }

    if (!opts.tosAcceptors) {
        opts.tosAcceptors = TermsOfServiceAcceptor.createAny();
    }

    if (!opts.cacheDir) {
        opts.cacheDir = 'tmp/acme';
    }

    if (!opts.serverNames) {
        if (opts.serverName) {
            opts.serverNames = [opts.serverName];
        }
        else if (process.env.SERVER_NAMES) {
            opts.serverNames = process.env.SERVER_NAMES.split(',');
        }
        else if (process.env.SERVER_NAME) {
            opts.serverNames = [process.env.SERVER_NAME];
        }
    }

    // convert to Manager options

    if (!opts.allowIdentifiers) {
        opts.allowIdentifiers = opts.serverNames;
    }

    if (!opts.fallbackIdentifier && Array.isArray(opts.allowIdentifiers)) {
        opts.fallbackIdentifier = opts.allowIdentifiers[0];
    }

    if (!opts.renewBeforeSeconds && !opts.renewBeforeFraction) {
        opts.renewBeforeFraction = 0.5;
    }

    if (!opts.externalAccountBinding && (opts.eabKid || opts.eabHmacKey)) {
        opts.externalAccountBinding = {
            kid: opts.eabKid,
            hmacKey: opts.eabHmacKey
        };
    }

    const SNICallback = createSNICallback(opts);

    return { SNICallback };
}

module.exports = { autoCert };
