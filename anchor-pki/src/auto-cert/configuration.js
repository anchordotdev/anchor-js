/* eslint-disable max-classes-per-file */
const fs = require('node:fs');
const path = require('node:path');

class ConfigurationError extends Error {}

class Configuration {
    static DEFAULT_BEFORE_SECONDS = 60 * 60 * 24 * 30; // 30 days in seconds

    static DEFAULT_BEFORE_FRACTION = 0.5; // when in the last 50% of the validity window, renew

    static DEFAULT_CHECK_EVERY_SECONDS = 60 * 60; // 1 hour

    static DEFAULT_OPTS = {
        name: null,
        allowIdentifiers: null,
        cacheDir: null,
        checkEverySeconds: Configuration.DEFAULT_CHECK_EVERY_SECONDS,
        contact: null,
        directoryUrl: null,
        externalAccountBinding: null,
        log: null,
        renewBeforeFraction: Configuration.DEFAULT_BEFORE_FRACTION,
        renewBeforeSeconds: Configuration.DEFAULT_BEFORE_SECONDS,
        tosAcceptors: null,
        workDir: null
    };

    name;

    #allowIdentifiers;

    #cacheDir;

    #checkEverySeconds = Configuration.DEFAULT_CHECK_EVERY_SECONDS;

    #contact;

    #directoryUrl;

    #externalAccountBinding;

    #log;

    #renewBeforeFraction = Configuration.DEFAULT_BEFORE_FRACTION;

    #renewBeforeSeconds = Configuration.DEFAULT_BEFORE_SECONDS;

    #tosAcceptors;

    #workDir;

    constructor({
        name = null,
        allowIdentifiers = null,
        cacheDir = null,
        checkEverySeconds = Configuration.DEFAULT_CHECK_EVERY_SECONDS,
        contact = null,
        directoryUrl = null,
        externalAccountBinding = null,
        log = console,
        renewBeforeFraction = Configuration.DEFAULT_BEFORE_FRACTION,
        renewBeforeSeconds = Configuration.DEFAULT_BEFORE_SECONDS,
        tosAcceptors = null,
        workDir = null
    }) {
        this.name = name;
        this.#allowIdentifiers = allowIdentifiers;
        this.#cacheDir = cacheDir;
        this.#checkEverySeconds = checkEverySeconds;
        this.#contact = contact;
        this.#directoryUrl = directoryUrl;
        this.#externalAccountBinding = externalAccountBinding;
        this.#log = log;
        this.#renewBeforeFraction = renewBeforeFraction;
        this.#renewBeforeSeconds = renewBeforeSeconds;
        this.#tosAcceptors = tosAcceptors;
        this.#workDir = workDir;
    }

    get account() {
        return {
            contact: this.#contact,
            externalAccountBinding: this.#externalAccountBinding
        };
    }

    //
    //  Return the fallback identifer for this configuration
    //
    //  look at all the identifiers, strip a leading wildcard off of all of
    //  them and then pick the one that has the fewest '.' in it, if there are
    //  ties for fewest, pick the first one in the list of ties. A minimum of
    //  2 '.' is required.
    //
    get fallbackIdentifier() {
        const notTld = this.#allowIdentifiers.map((identifier) => {
            const parts = identifier.split('.');
            if (parts[0] === '*') {
                parts.shift();
            }

            return (parts.length >= 3) ? parts.join('.') : null;
        }).filter((identifier) => identifier);

        const ordered = notTld.sort((a, b) => a.split('.').length - b.split('.').length);

        return ordered[0];
    }

    get allowIdentifiers() { return this.#allowIdentifiers; }

    get cacheDir() { return this.#cacheDir; }

    get checkEverySeconds() { return this.#checkEverySeconds; }

    get contact() { return this.#contact; }

    get directoryUrl() { return this.#directoryUrl; }

    get externalAccountBinding() { return this.#externalAccountBinding; }

    get log() { return this.#log; }

    get renewBeforeFraction() { return this.#renewBeforeFraction; }

    get renewBeforeSeconds() { return this.#renewBeforeSeconds; }

    get tosAcceptors() { return this.#tosAcceptors; }

    get workDir() { return this.#workDir; }

    get enabled() {
        try {
            this.validate();
            return true;
        }
        catch (error) {
            if (error instanceof ConfigurationError) {
                return false;
            }
            throw error;
        }
    }

    validate() {
        if (this.name === null) {
            throw new ConfigurationError("The Configuration instance has a misconfigured 'name' value. It is required");
        }
        this.#allowIdentifiers = this.#prepareAllowIdentifiers(this.allowIdentifiers);
        this.#checkEverySeconds = this.#prepareCheckEverySeconds(this.checkEverySeconds);
        this.#directoryUrl = this.#prepareDirectoryUrl(this.directoryUrl);
        this.#externalAccountBinding = this.#prepareExternalAccountBinding(this.externalAccountBinding);
        this.#renewBeforeFraction = this.#prepareRenewBeforeFraction(this.renewBeforeFraction);
        this.#renewBeforeSeconds = this.#prepareRenewBeforeSeconds(this.renewBeforeSeconds);
        this.#tosAcceptors = this.#prepareTosAcceptors(this.tosAcceptors);
        this.#ensureDirectory(this.workDir, 'workDir');
        this.#ensureDirectory(this.cacheDir, 'cacheDir');

        this.log.info(`[anchor-pki] The '${this.name}' Configuration instance is enabled`);

        return this;
    }

    #prepareAllowIdentifiers(allowIdentifiers) {
        let prepared = null;


        if (Array.isArray(allowIdentifiers)) {
            prepared = allowIdentifiers;
        }
        else if (typeof allowIdentifiers === 'string') {
            prepared = allowIdentifiers.split(',');
        }
        else if (allowIdentifiers === null) {
            if (process.env.SERVER_NAMES) {
                prepared = process.env.SERVER_NAMES.split(',');
            }
            else {
                prepared = process.env.ACME_ALLOW_IDENTIFIERS?.split(',');
            }
        }

        if (!prepared || prepared.length === 0) {
            throw new ConfigurationError(
                `The '${this.name}' Configuration instance has a misconfigured 'allowIdentifiers' value. `
                + 'Set it to a string, or an array of strings, '
                + 'or set the ACME_ALLOW_IDENTIFIERS environment variable to a comma separated list of identifiers.'
            );
        }

        return prepared;
    }

    #prepareCheckEverySeconds(checkEverySeconds) {
        checkEverySeconds = checkEverySeconds || Number.parseInt(process.env.AUTO_CERT_CHECK_EVERY, 10);

        if (!checkEverySeconds) {
            throw new ConfigurationError(
                `The '${this.name}' Configuration instance has a misconfigured 'checkEverySeconds' value. `
                + 'It must be set to a positive integer, or set the AUTO_CERT_CHECK_EVERY environment variable.'
            );
        }

        return checkEverySeconds;
    }

    #prepareDirectoryUrl(directoryUrl) {
        directoryUrl = directoryUrl || process.env.ACME_DIRECTORY_URL;

        if (!directoryUrl) {
            throw new ConfigurationError(
                `The '${this.name}' Configuration instance has a misconfigured 'directoryUrl' value. `
                + 'It must be set to a string, or set the ACME_DIRECTORY_URL environment variable.'
            );
        }

        return directoryUrl;
    }

    #prepareExternalAccountBinding(externalAccountBinding) {
        const kid = process.env.ACME_KID;
        const hmacKey = process.env.ACME_HMAC_KEY;

        if (externalAccountBinding?.kid && externalAccountBinding?.hmacKey) {
            return externalAccountBinding;
        }

        if (kid && hmacKey) {
            externalAccountBinding = {
                kid,
                hmacKey
            };
        }

        return externalAccountBinding;
    }

    #prepareRenewBeforeSeconds(renewBeforeSeconds) {
        const message = `The '${this.name}' Configuration instance has a misconfigured 'renewBeforeSeconds' value. `
                        + 'It must be set to an integer > 0, or set the ACME_RENEW_BEFORE_SECONDS environment variable.';

        renewBeforeSeconds = renewBeforeSeconds || process.env.ACME_RENEW_BEFORE_SECONDS;


        if (renewBeforeSeconds) {
            renewBeforeSeconds = Number.parseInt(renewBeforeSeconds, 10);
            if (Number.isNaN(renewBeforeSeconds) || (renewBeforeSeconds <= 0)) {
                throw new ConfigurationError(message);
            }
        }
        else {
            throw new ConfigurationError(message);
        }

        return renewBeforeSeconds;
    }

    #prepareRenewBeforeFraction(renewBeforeFraction) {
        const message = `The '${this.name}' Configuration instance has a misconfigured 'renewBeforeFraction' value. `
                         + 'It must be set to a float >= 0 and <= 1, or set the ACME_RENEW_BEFORE_FRACTION environment variable.';
        renewBeforeFraction = renewBeforeFraction || process.env.ACME_RENEW_BEFORE_FRACTION;

        if (renewBeforeFraction) {
            renewBeforeFraction = Number.parseFloat(renewBeforeFraction);
            if (Number.isNaN(renewBeforeFraction) || ((renewBeforeFraction < 0) || (renewBeforeFraction > 1))) {
                throw new ConfigurationError(message);
            }
        }
        else {
            throw new ConfigurationError(message);
        }

        return renewBeforeFraction;
    }

    #prepareTosAcceptors(tosAcceptors) {
        tosAcceptors = Array.isArray(tosAcceptors) ? tosAcceptors : [tosAcceptors];

        if (tosAcceptors.length === 0 || tosAcceptors.some((tos) => typeof tos !== 'function')) {
            throw new ConfigurationError(
                `The '${this.name}' Configuration instance has a misconfigured 'tosAcceptors' value. `
                + 'It must be set to a function or an array of functions.'
            );
        }

        return tosAcceptors;
    }

    #ensureDirectory(directory, property) {
        if (!directory) {
            return null;
        }

        const pathname = path.resolve(directory);
        const errorMessage = `The '${this.name}' Configuration instance has a misconfigured '${property}' value it resolves to (${pathname}). `
                              + `It must be set to directory, or path that can be created: ${pathname}`;

        const existStat = fs.statSync(pathname, { throwIfNoEntry: false });
        if (existStat && existStat.isDirectory()) {
            return directory;
        }

        // fs.mkdirSync sometimes throws errors when it cannot create a directory, and othertimes it returns undefined
        // so handle both cases.
        // Currently - it throws when there is read-only filesystem somewhere in the path, which might be a bug in node
        try {
            const result = fs.mkdirSync(pathname, { recursive: true });
            if (!result) {
                throw new ConfigurationError(errorMessage);
            }
        }
        catch (error) {
            throw new ConfigurationError(`${errorMessage} -> ${error.message}`);
        }

        return directory;
    }
}

module.exports = {
    Configuration,
    ConfigurationError
};
/* eslint-enable max-classes-per-file */
