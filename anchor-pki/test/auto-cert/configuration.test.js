const { Configuration, ConfigurationError } = require('anchor-pki/auto-cert/configuration');
const { TermsOfServiceAcceptor } = require('anchor-pki/auto-cert/terms-of-service-acceptor');
const fs = require('node:fs');
const { assert } = require('#chai-local');

describe('Configuration', () => {
    const DEFAULT_URL = 'https://anchor.dev/autocert-cab3bc/development/x509/ca/acme';
    const ORIGINAL_ENV = process.env;
    const directoryUrl = process.env.ACME_DIRECTORY_URL || DEFAULT_URL;

    beforeEach(() => {
        process.env = { ...ORIGINAL_ENV };
        process.env.ACME_DIRECTORY_URL = null;
    });

    afterEach(() => {
        process.env = ORIGINAL_ENV;
    });

    context('with a valid configuration', () => {
        let configuration;
        const configurationParams = {
            directoryUrl,
            name: 'valid_configuration',
            allowIdentifiers: 'test.lcl.host',
            contact: 'development@anchor.dev',
            externalAccountBinding: { kid: 'value', hmacKey: 'value' },
            tosAcceptors: TermsOfServiceAcceptor.createAny()
        };

        beforeEach(() => {
            configuration = new Configuration(configurationParams);
            configuration.validate();
        });

        it('has an allowIdentifiers attribute', () => {
            assert.equal(configuration.allowIdentifiers, 'test.lcl.host');
        });

        it('has an directoryUrl attribute', () => {
            assert.equal(configuration.directoryUrl, directoryUrl);
        });

        it('has an contact attribute', () => {
            assert.equal(configuration.contact, 'development@anchor.dev');
        });

        it('has a checkEverySeconds attribute', () => {
            assert.equal(configuration.checkEverySeconds, 3600);
        });

        it('has an externalAccountBinding attribute', () => {
            assert.deepEqual(configuration.externalAccountBinding, {
                kid: 'value',
                hmacKey: 'value'
            });
        });

        it('has an tosAcceptors attribute', () => {
            assert.isArray(configuration.tosAcceptors);
            configuration.tosAcceptors.forEach((acceptor) => assert.isFunction(acceptor));
        });

        it('can have an array of tosAcceptors', () => {
            const cfgParams = { ...configurationParams };
            cfgParams.tosAcceptors = [
                TermsOfServiceAcceptor.createRegex(/^https:\/\/example.com/i),
                TermsOfServiceAcceptor.createRegex(/^https:\/\/example.test/i)
            ];
            const config = new Configuration(cfgParams);
            config.validate();
            assert.isArray(config.tosAcceptors);
        });

        it('can use the tosAcceptors to test a url', () => {
            assert.isArray(configuration.tosAcceptors);
            const results = configuration.tosAcceptors.map((acceptor) => acceptor('https://example.com'));
            const result = results.some((r) => r);
            assert.isTrue(result);
        });

        it('is enabled', () => {
            assert.isTrue(configuration.enabled);
        });

        it('has a name', () => {
            assert.equal(configuration.name, 'valid_configuration');
        });

        it('can change its name', () => {
            configuration.name = 'new_name';
            assert.equal(configuration.name, 'new_name');
        });

        it('can set allowIdentifiers to an array', () => {
            const testParams = { ...configurationParams };
            const allowIdentifiers = ['test.lcl.host', 'test2.lcl.host'];
            testParams.allowIdentifiers = allowIdentifiers;
            const config = new Configuration(testParams);
            config.validate();
            assert.deepEqual(config.allowIdentifiers, allowIdentifiers);
        });

        it('returns the contact and eab attributes for account()', () => {
            const account = {
                contact: configurationParams.contact,
                externalAccountBinding: configurationParams.externalAccountBinding
            };
            configuration.validate();
            assert.deepEqual(configuration.account, account);
        });

        it('loads external account bindings from environment variables', () => {
            const testParams = { ...configurationParams };
            testParams.externalAccountBinding = null;
            process.env.ACME_KID = 'kid';
            process.env.ACME_HMAC_KEY = 'hmacKey';

            const config = new Configuration(testParams);
            config.validate();

            assert.equal(config.externalAccountBinding.kid, 'kid');
            assert.equal(config.externalAccountBinding.hmacKey, 'hmacKey');
        });

        it('loads allowIdentifiers from environment variables', () => {
            const testParams = { ...configurationParams };
            testParams.allowIdentifiers = null;
            process.env.ACME_ALLOW_IDENTIFIERS = 'env.lcl.host';

            const config = new Configuration(testParams);
            config.validate();

            assert.deepEqual(config.allowIdentifiers, ['env.lcl.host']);
        });

        it('returns fallback identifier with one allow', () => {
            const testParams = { ...configurationParams };
            testParams.allowIdentifiers = 'fallback.lcl.host';

            const config = new Configuration(testParams);
            config.validate();

            assert.equal(config.fallbackIdentifier, 'fallback.lcl.host');
        });

        it('returns fallback with wildcard result', () => {
            const testParams = { ...configurationParams };
            testParams.allowIdentifiers = ['auth.fallback.lcl.host', '*.fallback.lcl.host'];
            const config = new Configuration(testParams);
            config.validate();

            assert.equal(config.fallbackIdentifier, 'fallback.lcl.host');
        });

        it('returns fallback with invalid wildcard fallback', () => {
            const testParams = { ...configurationParams };
            testParams.allowIdentifiers = ['auth.fallback.lcl.host', '*.lcl.host'];
            const config = new Configuration(testParams);
            config.validate();

            assert.equal(config.fallbackIdentifier, 'auth.fallback.lcl.host');
        });

        it('returns fallback using minimal dots match', () => {
            const testParams = { ...configurationParams };
            testParams.allowIdentifiers = ['x.auth.fallback.lcl.host', '*.fallback.lcl.host'];
            const config = new Configuration(testParams);
            config.validate();

            assert.equal(config.fallbackIdentifier, 'fallback.lcl.host');
        });

        it('returns fallback from first minimum', () => {
            const testParams = { ...configurationParams };
            testParams.allowIdentifiers = ['auth.fallback.lcl.host', 'admin.fallback.lcl.host'];
            const config = new Configuration(testParams);
            config.validate();

            assert.equal(config.fallbackIdentifier, 'auth.fallback.lcl.host');
        });
    });

    context('with an invalid configuration', () => {
        const name = 'invalid_configuration';
        const allowIdentifiers = 'test.lcl.host';
        const tosAcceptors = TermsOfServiceAcceptor.createAny();

        it('is not enabled', () => {
            const config = new Configuration({ name });
            assert.isFalse(config.enabled);
        });

        it('raises an error when the directoryUrl is missing', () => {
            const config = new Configuration({ name, allowIdentifiers, tosAcceptors });
            assert.throws(() => { config.validate(); }, ConfigurationError, /misconfigured 'directoryUrl'/);
        });

        it('raises an error when the allowIdentifiers is missing', () => {
            const config = new Configuration({ name, directoryUrl });
            assert.throws(() => { config.validate(); }, ConfigurationError, /misconfigured 'allowIdentifiers'/);
        });

        it('raises an error when the allowIdentifiers is falsy and env is not set', () => {
            const config = new Configuration({ name, directoryUrl, allowIdentifiers: null });
            assert.throws(() => { config.validate(); }, ConfigurationError, /misconfigured 'allowIdentifiers'/);
        });

        it('raises an error when the name is missing', () => {
            const config = new Configuration({ allowIdentifiers, directoryUrl, tosAcceptors });
            assert.throws(() => { config.validate(); }, ConfigurationError, /misconfigured 'name'/);
        });

        it('raises an error when renewBeforeSeconds is not a number', () => {
            const config = new Configuration({ name, allowIdentifiers, directoryUrl, renewBeforeSeconds: 'not a number' });
            assert.throws(() => { config.validate(); }, ConfigurationError, /misconfigured 'renewBeforeSeconds'/);
        });

        it('raises an error when renewBeforeSeconds is falsy', () => {
            const config = new Configuration({ name, allowIdentifiers, directoryUrl, renewBeforeSeconds: null });
            assert.throws(() => { config.validate(); }, ConfigurationError, /misconfigured 'renewBeforeSeconds'/);
        });

        it('raises an error when the renewBeforeSeconds is not a positive number', () => {
            const config = new Configuration({ name, allowIdentifiers, directoryUrl, renewBeforeSeconds: -1 });
            assert.throws(() => { config.validate(); }, ConfigurationError, /misconfigured 'renewBeforeSeconds'/);
        });

        it('raises an error when renewBeforeFraction is not a number', () => {
            const config = new Configuration({ name, allowIdentifiers, directoryUrl, renewBeforeFraction: 'not a number' });
            assert.throws(() => { config.validate(); }, ConfigurationError, /misconfigured 'renewBeforeFraction'/);
        });

        it('raises an error when renewBeforeFraction  is falsy', () => {
            const config = new Configuration({ name, allowIdentifiers, directoryUrl, renewBeforeFraction: null });
            assert.throws(() => { config.validate(); }, ConfigurationError, /misconfigured 'renewBeforeFraction'/);
        });

        it('raises an error when the tosAccceptors is missing', () => {
            const config = new Configuration({ name, allowIdentifiers, directoryUrl });
            assert.throws(() => { config.validate(); }, ConfigurationError, /misconfigured 'tosAcceptors'/);
        });

        it('raises an error when the tosAccceptors is not a function', () => {
            const config = new Configuration({ name, allowIdentifiers, directoryUrl, tosAcceptors: 'not a function' });
            assert.throws(() => { config.validate(); }, ConfigurationError, /misconfigured 'tosAcceptors'/);
        });

        it('raises an error when the workDir is not writable', () => {
            const workDir = '/sys/work-dir-not-writable'; // /sys is a read-only filesystem
            const config = new Configuration({ name, allowIdentifiers, directoryUrl, tosAcceptors, workDir });
            assert.throws(() => { config.validate(); }, ConfigurationError, /misconfigured 'workDir'/);
        });

        it('raises an error when the cacheDir is not writable', () => {
            const cacheDir = '/sys/cache-dir-not-writable'; // /sys is a read-only filesystem
            const config = new Configuration({ name, allowIdentifiers, directoryUrl, tosAcceptors, cacheDir });
            assert.throws(() => { config.validate(); }, ConfigurationError, /misconfigured 'cacheDir'/);
        });

        it('creates a workDir', () => {
            const workDir = '/tmp/anchor-pki/workDir';
            const config = new Configuration({ name, allowIdentifiers, directoryUrl, tosAcceptors, workDir });
            config.validate();
            const stat = fs.statSync(config.workDir);
            assert.isTrue(stat.isDirectory());
            fs.rmdirSync(config.workDir);
        });

        it('creates a cacheDir', () => {
            const cacheDir = '/tmp/anchor-pki/cacheDir';
            const config = new Configuration({ name, allowIdentifiers, directoryUrl, tosAcceptors, cacheDir });
            config.validate();
            const stat = fs.statSync(config.cacheDir);
            assert.isTrue(stat.isDirectory());
            fs.rmdirSync(config.cacheDir);
        });

        it('is okay if the cacheDir already exists', () => {
            const cacheDir = '/tmp/anchor-pki/cacheDir';
            fs.mkdirSync(cacheDir, { recursive: true });
            const stat = fs.statSync(cacheDir);
            assert.isTrue(stat.isDirectory());

            const config = new Configuration({ name, allowIdentifiers, directoryUrl, tosAcceptors, cacheDir });
            assert.doesNotThrow(() => { config.validate(); });

            fs.rmdirSync(config.cacheDir);
        });
    });
});
