const { Any, createAny } = require('anchor-pki/auto-cert/terms-of-service-acceptor/any');
const { Regex, createRegex } = require('anchor-pki/auto-cert/terms-of-service-acceptor/regex');

module.exports.TermsOfServiceAcceptor = {
    Any,
    Regex,
    createAny,
    createRegex
};
