const { createSNICallback } = require('anchor-pki/auto-cert/sni-callback');
const { TermsOfServiceAcceptor } = require('anchor-pki/auto-cert/terms-of-service-acceptor');
const https = require('node:https');
const httpProxy = require('http-proxy');
const log = require('next/dist/build/output/log');
const nextVersion = require('next/package.json').version;

const configFn = function(config) { return config; };

function configureProxy(autoCertConfig, port) {
    const bindingHost = '127.0.0.1';
    const defaultHttpsPort = 4333;

    const displayHost = process.env.SERVER_NAMES || process.env.ACME_ALLOW_IDENTIFIERS || bindingHost;

    const httpsPort = parseInt(process.env.HTTPS_PORT, 10) || defaultHttpsPort;

    if (!process.env.HTTPS_PORT) {
        log.warn(`[AutoCert] HTTPS_PORT is not set, assuming ${httpsPort}`);
    }

    if (!Array(autoCertConfig.enabledEnv).flat().includes(process.env.NODE_ENV)) {
        log.warn(`[AutoCert] NODE_ENV is not set to ${autoCertConfig.enabledEnv}, skipping auto-cert proxy`);
        return configFn;
    }

    log.wait('[AutoCert] Starting auto-cert proxy ...');
    const SNICallback = createSNICallback({
        name: 'sni-callback',
        tosAcceptors: TermsOfServiceAcceptor.createAny(),
        cacheDir: 'tmp/acme',
        log
    });

    const proxy = httpProxy.createProxyServer({});

    const server = https.createServer({ SNICallback }, (req, res) => {
        proxy.web(req, res, {
            target: {
                host: bindingHost,
                port
            }
        });
    });

    server.on('listening', () => {
        displayHost.split(',').forEach((dhost) => {
            log.ready(`[AutoCert] Listening on https://${dhost}:${httpsPort} -> http://${bindingHost}:${port}`);
        });
    });

    server.on('upgrade', (req, socket, _head) => {
        proxy.ws(req, socket, {
            target: {
                host: bindingHost,
                port
            }
        });
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            return;
        }
        log.error('[AutoCert] Auto-cert proxy error', err);
    });

    server.listen(httpsPort, bindingHost);

    return configFn;
}

function standaloneMode(autoCertConfig) {
    const defaultPort = 3000;
    const port = parseInt(process.env.PORT, 10) || defaultPort;

    // TODO: check for 'run dev' e.g. server mode

    if (!process.env.PORT) {
        log.warn(`[AutoCert] PORT is not set, assuming ${port}`);
    }

    return configureProxy(autoCertConfig, port);
}

function forkingMode(autoCertConfig) {
    if (!process.env.NEXT_PRIVATE_WORKER) {
        return configFn;
    }
    if (!process.env.PORT) {
        return configFn;
    }

    const port = parseInt(process.env.PORT, 10);

    return configureProxy(autoCertConfig, port);
}

function anchorAutoCertProxy(autoCertConfig) {
    if (nextVersion.match(/^14\./)) {
        return forkingMode(autoCertConfig);
    }
    return standaloneMode(autoCertConfig);
}

module.exports = anchorAutoCertProxy;
