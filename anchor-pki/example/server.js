const { createSNICallback } = require('anchor-pki/auto-cert/sni-callback');
const { TermsOfServiceAcceptor } = require('anchor-pki/auto-cert/terms-of-service-acceptor');
const https = require('node:https');

const bindingHost = '127.0.0.1';
const displayHost = process.env.ACME_ALLOW_IDENTIFIERS || bindingHost;
const port = process.env.HTTPS_PORT || 4433;

const app = (req, res) => {
    // Set the response HTTP header with HTTP status and Content type
    res.writeHead(200, { 'Content-Type': 'text/plain' });

    // Send the response body "Hello World"
    res.end('Hello World\n');
};

const SNICallback = createSNICallback({
    name: 'sni-callback',
    tosAcceptors: TermsOfServiceAcceptor.createAny(),
    cacheDir: 'tmp/acme'

    // The following are defaults
    //
    // directoryUrl: process.env.ACME_DIRECTORY_URL,
    // contact: process.env.ACME_CONTACT,
    // externalAccountBinding: {
    //   kid: process.env.ACME_KID,
    //   hmacKey: process.env.ACME_HMAC_KEY
    // },

});


// Create HTTP server
const server = https.createServer({ SNICallback }, app);

// Prints a log once the server starts listening
server.listen(port, bindingHost, () => {
    displayHost.split(',').forEach((bhost) => {
        console.info(`Server running at https://${bhost}:${port}/`); // eslint-disable-line no-console
    });
});
