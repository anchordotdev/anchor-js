const { IdentifierNotAllowedError } = require('anchor-pki/auto-cert/manager');

const { assert } = require('#chai-local');
const { setupPolly, pollyConfiguration } = require('#polly-local');

const {
    ORIGINAL_ENV,
    DEFAULT_URL,
    DEFAULT_HOST,
    cleanupManager,
    createManagerParameters,
    createManager,
    liveAuthManagerParameters
} = require('#fixtures');

describe('Manager', () => {
    let configurationParams = null;
    let manager = null;
    let cert = null;
    const host = DEFAULT_HOST;

    setupPolly(pollyConfiguration);
    beforeEach(() => {
        process.env = { ...ORIGINAL_ENV };
    });

    afterEach(() => {
        process.env = { ...ORIGINAL_ENV };

        cleanupManager(manager);
    });

    context('manager delegation', () => {
        beforeEach(() => {
            configurationParams = {
                ...createManagerParameters(),
                name: 'test_manager_delegation',
                allowIdentifiers: 'manager-delegation.lcl.host',
                cacheDir: 'tmp/anchor-pki-test-cache-for-delegation',
                renewBeforeSeconds: 42,
                renewBeforeFraction: 0.42,
                checkEverySeconds: 42
            };
            manager = createManager(configurationParams);
        });

        it('returns the configuration directoryUrl', () => {
            assert.equal(manager.directoryUrl, DEFAULT_URL);
        });

        it('returns the configuration contact', () => {
            assert.equal(manager.contact, 'developer@anchor.dev');
        });

        it('returns the configuration cacheDir', () => {
            assert.equal(manager.cacheDir, 'tmp/anchor-pki-test-cache-for-delegation');
        });

        it('returns the configuration renewBeforeSeconds', () => {
            assert.equal(manager.renewBeforeSeconds, 42);
        });

        it('returns the configuration renewBeforeFraction', () => {
            assert.equal(manager.renewBeforeFraction, 0.42);
        });

        it('returns the check every seconds', () => {
            assert.equal(manager.checkEverySeconds, 42);
        });

        it('returns the tos acceptor', () => {
            assert.equal(manager.tosAcceptors[0]('whatever'), true);
        });

        it('returns the external account binding', () => {
            assert.deepEqual(manager.externalAccountBinding, { kid: 'kid', hmacKey: 'hmacKey' });
        });
    });

    context('manager cache', () => {
        beforeEach(() => {
            configurationParams = {
                ...liveAuthManagerParameters(),
                allowIdentifiers: host,
                name: 'test_manager_cache',
                cacheDir: 'tmp/anchor-pki-test-cache-manager-cache'
            };
            manager = createManager(configurationParams);
        });

        it('returns the cache directory', () => {
            assert.equal(manager.cacheDir, 'tmp/anchor-pki-test-cache-manager-cache');
        });

        it('accountKey is cached', async () => {
            const accountKey = await manager.accountKey();
            const againAccountKey = await manager.accountKey();
            assert.deepEqual(accountKey, againAccountKey);
        });

        it('the certificate data is cached', async () => {
            cert = await manager.managedCertificate(host);
            const certData = await manager.cacheFetch(host);
            const parsedData = JSON.parse(certData);
            assert.equal(parsedData.certPem, cert.certPem);
            assert.equal(parsedData.keyPem, cert.keyPem);
        });

        it('returns the same cert from the cache', async () => {
            cert = await manager.managedCertificate(host);
            const cert2 = await manager.managedCertificate(host);
            assert.equal(cert.serial, cert2.serial);
        });
    });

    context('when the manager is configured with a single allow identifier', () => {
        beforeEach(() => {
            configurationParams = {
                ...liveAuthManagerParameters(),
                allowIdentifiers: host,
                name: 'test_manager_single_allow',
                cacheDir: null
            };
            manager = createManager(configurationParams);
        });

        it('provisions a certificate', async () => {
            const result = await manager.managedCertificate(host);
            assert.match(result.certPem, /BEGIN CERTIFICATE/, 'cert starts with BEGIN CERTIFICATE');
        });

        it('provisions a key', async () => {
            const result = await manager.managedCertificate(host);
            assert.match(result.keyPem, /BEGIN PRIVATE KEY/, 'key starts with BEGIN EC PRIVATE KEY');
        });

        it('raises an error when a name is not accepted for a certificate', async function() {
            if (process.env.CI === 'true') { this.skip(); }

            const commonName = 'not-the-host-you-are-looking-for.lcl.host';

            assert.eventually.throws(manager.managedCertificate(commonName), IdentifierNotAllowedError);
        });

        it('denied identifiers returns empty array', async () => {
            assert.deepEqual(manager.deniedIdentifiers(null), []);
        });

        it('denied identifiers returns array', async () => {
            assert.deepEqual(manager.deniedIdentifiers('bad.host.name'), ['bad.host.name']);
        });

        it('returns fallback cert if all ids are denied', async () => {
            const commonName = 'invalid.bad.host';
            cert = await manager.managedCertificate(commonName);
            assert.equal(cert.commonName, host);
        });
    });

    context('when the manager is configured with allow identifiers', () => {
        const identifiers = [`x.${host}`, `y.${host}`];

        beforeEach(() => {
            configurationParams = {
                ...liveAuthManagerParameters(),
                allowIdentifiers: [host, `*.${host}`],
                name: 'test_manager_multiple_allow'
            };
            manager = createManager(configurationParams);
        });

        it('provisions a certificate', async () => {
            const result = await manager.managedCertificate(host, identifiers);
            assert.match(result.certPem, /BEGIN CERTIFICATE/, 'cert starts with BEGIN CERTIFICATE');
        });

        it('provisions a key', async () => {
            const result = await manager.managedCertificate(host, identifiers);
            assert.match(result.keyPem, /BEGIN PRIVATE KEY/, 'cert starts with BEGIN CERTIFICATE');
        });

        it('has all the names requested in the cert', async () => {
            const result = await manager.managedCertificate(host, identifiers);
            const certIdentifiers = result.identifiers;
            identifiers.forEach((identifier) => assert.include(certIdentifiers, identifier));
        });

        it('raises an error when a name is not accepted for a certificate', async function() {
            if (process.env.CI === 'true') { this.skip(); }

            identifiers.push('not-the-host-you-are-looking-for.lcl.host');
            assert.eventually.throws(manager.managedCertificate(host, identifiers), IdentifierNotAllowedError);
        });

        it('returns the same cert for the same host', async () => {
            const x1Cert = await manager.managedCertificate(`x.${host}`);

            // set a renewal check date to make sure it hasn't expired
            const renewalCheckDelta = 60 * 60 * 24 * 1000; // 1 day in millis
            const checkAgainstDate = new Date(x1Cert.validFromDate.valueOf() + renewalCheckDelta);

            const x2Cert = await manager.managedCertificate(`x.${host}`, [], checkAgainstDate);

            assert.equal(x1Cert.serial, x2Cert.serial);
        });

        it.skip('returns the same cert for a given set of identifiers', async () => {
            const xCert = await manager.managedCertificate(`x.${host}`);
            const yCert = await manager.managedCertificate(`y.${host}`);
            assert.equal(xCert.serial, yCert.serial);
        });
    });

    context('renewal logic', () => {
        beforeEach(() => {
            configurationParams = {
                ...liveAuthManagerParameters(),
                allowIdentifiers: host,
                name: 'test_manager_renewal_logic'
            };
            manager = createManager(configurationParams);
        });

        it('renewalAfterFromSeconds returns null if beforeSeconds is falsy', async () => {
            cert = await manager.managedCertificate(host);
            assert.isNull(manager.renewAfterFromSeconds(cert, null));
        });

        it('renewalAfterFromSeconds returns null if renewal period has already passed', async () => {
            cert = await manager.managedCertificate(host);
            const to = cert.validToDate.valueOf();
            const from = cert.validFromDate.valueOf();
            const beforeFromDelta = ((to - from) / 1000) + 1;

            assert.isNull(manager.renewAfterFromSeconds(cert, beforeFromDelta));
        });

        it('renewalAfterFromSeconds returns a date between the to and from dates of the cert', async () => {
            cert = await manager.managedCertificate(host);
            const renewAfter = manager.renewAfterFromSeconds(cert);
            assert.isAtLeast(renewAfter, cert.validFromDate);
            assert.isAtMost(renewAfter, cert.validToDate);
        });

        it('renewalAfterFromFaction returns null if beforeFraction is falsy', async () => {
            cert = await manager.managedCertificate(host);
            assert.isNull(manager.renewAfterFromFraction(cert, null));
        });

        it('renewalAfterFromFraction returns null if beforeFraction is < 0', async () => {
            cert = await manager.managedCertificate(host);
            assert.isNull(manager.renewAfterFromFraction(cert, -0.42));
        });

        it('renwalAfterFromFraction returns null if beforeFraction is > 1', async () => {
            cert = await manager.managedCertificate(host);
            assert.isNull(manager.renewAfterFromFraction(cert, 1.42));
        });

        it('renewalAfterFromFraction returns a date between the to and from dates of the cert', async () => {
            cert = await manager.managedCertificate(host);
            const renewAfter = manager.renewAfterFromFraction(cert);
            assert.isAtLeast(renewAfter, cert.validFromDate);
            assert.isAtMost(renewAfter, cert.validToDate);
        });

        it('needsRenewal returns false if the cert is not expiring', async () => {
            cert = await manager.managedCertificate(host);
            const validNow = new Date(cert.validFromDate.valueOf() + 60000);
            assert.isFalse(manager.needsRenewal(cert, validNow));
        });

        it('needsRenewal returns true if the cert is in the expiration window', async () => {
            cert = await manager.managedCertificate(host);
            const renewalCheckDelta = 60 * 60 * 24 * 16 * 1000; // 16 days in millis
            const checkAgainstDate = new Date(cert.validFromDate.valueOf() + renewalCheckDelta);
            assert.isTrue(manager.needsRenewal(cert, checkAgainstDate));
        });

        it('managedCertificate reterns a new cert if the current one has expired', async () => {
            cert = await manager.managedCertificate(host);
            const firstSerial = cert.hexSerial();
            const renewalCheckDelta = 60 * 60 * 24 * 16 * 1000; // 16 days in millis
            const checkAgainstDate = new Date(cert.validFromDate.valueOf() + renewalCheckDelta);
            const newCert = await manager.managedCertificate(host, [], checkAgainstDate);

            assert.notEqual(newCert.hexSerial(), firstSerial);
        });
    });
});
