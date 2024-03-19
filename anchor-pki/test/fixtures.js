const fs = require('node:fs');
const { Configuration } = require('anchor-pki/auto-cert/configuration');
const { Manager } = require('anchor-pki/auto-cert/manager');
const { TermsOfServiceAcceptor } = require('anchor-pki/auto-cert/terms-of-service-acceptor');

const DEFAULT_URL = 'https://anchor.dev/autocert-cab3bc/development/x509/ca/acme';
const DEFAULT_HOST = 'anchor-pki-js-testing.lcl.host';
const DEFAULT_CONFIG_PARAMETERS = {
    name: 'valid',
    allowIdentifiers: 'test.lcl.host',
    contact: 'developer@anchor.dev',
    externalAccountBinding: { kid: 'kid', hmacKey: 'hmacKey' },
    tosAcceptors: TermsOfServiceAcceptor.createAny()
};

const ORIGINAL_ENV = process.env;

function cleanupManager(manager) {
    if (manager && manager.cacheDir) {
        fs.rmSync(
            manager.cacheDir,
            { recursive: true, force: true, maxRetries: 3 }
        );
    }

    if (manager && manager.workDir) {
        fs.rmSync(
            manager.workDir,
            { recursive: true, force: true, maxRetries: 3 }
        );
    }
}

function createDefaultParameters() {
    return {
        ...DEFAULT_CONFIG_PARAMETERS,
        directoryUrl: DEFAULT_URL
    };
}

function createManagerParameters(params = createDefaultParameters()) {
    return {
        ...params,
        name: 'test_manager',
        allowIdentifiers: 'manager.lcl.host'
    };
}

function createManagerConfiguration(params = createManagerParameters()) {
    return new Configuration(params);
}

function createManager(params = createManagerParameters()) {
    const config = new Configuration(params);
    return new Manager(config);
}

function liveAuthManagerParameters(params = createManagerParameters()) {
    const directoryUrl = process.env.ACME_DIRECTORY_URL || DEFAULT_URL;

    // These 2 values must have been used for the recordings of the test and any
    // use case where the CI environment variable is not 'true'.
    // https://anchor.dev/autocert-cab3bc/services/anchor-pki-js-testing
    const kid = 'aae_7gcqfZzgOFAZlX_n2ziHS7Sp9HuwiqWuPscxyi5clfh7';
    const hmacKey = '0u_ysianguUj5tLZ8jBrmKit78SWhasWKI-jO25ZTaeWsOSocywz_y4aqrmbZFmn';

    return {
        ...params,
        name: 'test_manager_cert',
        directoryUrl,
        allowIdentifiers: [
            DEFAULT_HOST,
            `*.${DEFAULT_HOST}`
        ],
        cacheDir: 'tmp/anchor-pki-test-cache',
        externalAccountBinding: { kid, hmacKey },
        renewBeforeSeconds: 60 * 60 * 24 * 14 // 14 days for tests
    };
}
module.exports = {
    ORIGINAL_ENV,
    DEFAULT_URL,
    DEFAULT_HOST,
    DEFAULT_CONFIG_PARAMETERS,
    cleanupManager,
    createDefaultParameters,
    createManagerParameters,
    createManagerConfiguration,
    createManager,
    liveAuthManagerParameters
};
