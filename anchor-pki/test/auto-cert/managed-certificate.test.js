const { assert } = require('#chai-local');
const { setupPolly, pollyConfiguration } = require('#polly-local');
const { ORIGINAL_ENV, DEFAULT_HOST, cleanupManager, createManager, liveAuthManagerParameters } = require('#fixtures');

describe('ManagedCertificate', () => {
    let configurationParams = null;
    let manager = null;
    let cert = null;
    const host = DEFAULT_HOST;

    setupPolly(pollyConfiguration);
    beforeEach(() => {
        process.env = { ...ORIGINAL_ENV };
        configurationParams = liveAuthManagerParameters();
    });

    afterEach(() => {
        process.env = { ...ORIGINAL_ENV };

        cleanupManager(manager);
    });

    context('when the manager is configured with a single allow identifier', () => {
        beforeEach(() => {
            configurationParams.allowIdentifiers = [host];
            manager = createManager(configurationParams);
        });
        it('the common name is the allowed identifier', async () => {
            cert = await manager.managedCertificate(host);
            assert.equal(cert.commonName, host);
        });

        it('allNames is an array with the host in it', async () => {
            assert.deepEqual(cert.allNames, [host]);
        });
    });

    context('general accessors', () => {
        beforeEach(() => {
            configurationParams.allowIdentifiers = [host];
            manager = createManager(configurationParams);
        });

        it('serial method returns the hex serial', async () => {
            cert = await manager.managedCertificate(host);
            assert.equal(cert.serial.length, 24);
            assert.match(cert.serial, /^[0-9A-F]{24}$/);
        });

        it('hexSerial method returns the hex serial joined', async () => {
            cert = await manager.managedCertificate(host);
            const hexSerial = cert.hexSerial();
            assert.equal(hexSerial.length, 35);
            assert.match(hexSerial, /^[:0-9A-F]{35}$/);
        });

        it('has a string date for validFrom', async () => {
            cert = await manager.managedCertificate(host);
            assert.isString(cert.validFrom);
        });

        it('has a string date for validTo', async () => {
            cert = await manager.managedCertificate(host);
            assert.isString(cert.validTo);
        });

        it('has a Date for validFromDate', async () => {
            cert = await manager.managedCertificate(host);
            assert.instanceOf(cert.validFromDate, Date);
        });

        it('has a Date for validToDate', async () => {
            cert = await manager.managedCertificate(host);
            assert.instanceOf(cert.validToDate, Date);
        });
    });

    context('when the manager is configured with a multiple allow identifier', () => {
        const identifiers = [`x.${host}`, `y.${host}`, `z.${host}`];

        beforeEach(() => {
            configurationParams.allowIdentifiers = [host, `*.${host}`];
            manager = createManager(configurationParams);
        });

        it('the common name is the first allowed identifier', async () => {
            cert = await manager.managedCertificate(host, identifiers);
            assert.equal(cert.commonName, host);
        });

        it('allNames is an array with the host and all identifiers in it', async () => {
            cert = await manager.managedCertificate(host, identifiers);
            const expected = [host, ...identifiers];
            assert.deepEqual(cert.allNames, expected);
        });
    });
});
