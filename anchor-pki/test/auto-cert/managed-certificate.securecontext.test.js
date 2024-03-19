// This is a set of tests that currently cannot be run with Polly and so need to
// be turned off during CI.
//
const { assert } = require('#chai-local');
const {
    ORIGINAL_ENV,
    DEFAULT_HOST,
    cleanupManager,
    createManager,
    liveAuthManagerParameters
} = require('#fixtures');
// const { setupPolly, pollyConfiguration } = require('#polly-local');

describe('ManagedCertificate', () => {
    let configurationParams = null;
    let manager = null;
    let cert = null;
    const host = DEFAULT_HOST;

    // TODO: need to figure out how keep ths CSR key for the secure context so that the
    //       polly captured data matches the key and the TLS library in node doesn't
    //       yell about:
    //
    //      Error: error:05800074:x509 certificate routines::key values mismatch
    //
    before(function() {
        if (process.env.CI === 'true') {
            this.skip();
        }
    });

    // setupPolly(pollyConfiguration);
    beforeEach(async () => {
        process.env = { ...ORIGINAL_ENV };
        configurationParams = liveAuthManagerParameters();
        manager = createManager(configurationParams);
        cert = await manager.managedCertificate(host);
    });

    afterEach(() => {
        process.env = { ...ORIGINAL_ENV };

        cleanupManager(manager);
    });

    context('secureContext', () => {
        it('has a chain with 3 certs', () => {
            assert.equal(cert.certChain.length, 3);
        });

        it('returns a secure context', () => {
            const secureContext = cert.secureContext();
            assert.isObject(secureContext);
        });

        it('when called multiple times, returns the same secure context', () => {
            const secureContext = cert.secureContext();
            assert.isObject(secureContext);

            const againContext = cert.secureContext();

            assert.deepEqual(secureContext, againContext);
        });
    });
});
