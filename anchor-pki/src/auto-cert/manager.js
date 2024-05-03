/* eslint-disable max-classes-per-file */
const acme = require('acme-client');
const cacache = require('cacache');
const url = require('node:url');

const { Configuration } = require('anchor-pki/auto-cert/configuration');
const { IdentifierPolicy } = require('anchor-pki/auto-cert/identifier-policy');
const { ManagedCertificate } = require('anchor-pki/auto-cert/managed-certificate');

class IdentifierNotAllowedError extends Error {}

class Manager {
    static FALLBACK_RENEW_BEFORE_SECONDS = 86400; // 1 day

    constructor(opts = Configuration.DEFAULT_OPTS) {
        this.configuration = opts.configuration || new Configuration(opts);
        this.configuration.validate();

        this.identifierPolicies = IdentifierPolicy.build(this.configuration.allowIdentifiers);

        this.managedCertificates = new Map();
    }

    get directoryUrl() {
        return this.configuration.directoryUrl;
    }

    get contact() {
        return this.configuration.contact;
    }

    get externalAccountBinding() {
        return this.configuration.externalAccountBinding;
    }

    get fallbackIdentifier() {
        return this.configuration.fallbackIdentifier;
    }

    get tosAcceptors() {
        return this.configuration.tosAcceptors;
    }

    get cacheDir() {
        return this.configuration.cacheDir;
    }

    get log() {
        return this.configuration.log;
    }

    get checkEverySeconds() {
        return this.configuration.checkEverySeconds;
    }

    get renewBeforeSeconds() {
        return this.configuration.renewBeforeSeconds;
    }

    get renewBeforeFraction() {
        return this.configuration.renewBeforeFraction;
    }

    l;

    sniCallback(servername, callback) {
        this.managedCertificate(servername).then((managedCert) => {
            callback.call(null, null, managedCert.secureContext());
        }).catch(callback);
    }

    async managedCertificate(commonName, identifiers = [], now = new Date()) {
        const fullIdentifiers = [commonName, ...identifiers];
        const deniedList = this.deniedIdentifiers(fullIdentifiers);

        if (deniedList.length > 0) {
            commonName = this.fallbackIdentifier;
            identifiers = [];
        }

        let managedCertificate = this.managedCertificates.get(commonName);

        // check if the in memory managed certificate is still valid
        if (managedCertificate && !this.needsRenewal(managedCertificate, now)) {
            return managedCertificate;
        }

        // check the cache and see if there is a cert there and if it is still
        // valid
        let certData = await this.cacheFetch(commonName);
        let parsedData = null;

        if (certData) {
            parsedData = JSON.parse(certData);
            managedCertificate = new ManagedCertificate({ ...parsedData });
            if (this.needsRenewal(managedCertificate, now)) {
                managedCertificate = null;
            }
            else {
                if (typeof this.log.debug === 'function') {
                    this.log.debug(`[anchor-pki] Certificate for ${commonName} returned from disk cache (${this.cacheDir})`);
                }
                return managedCertificate;
            }
        }

        // at this point there is no cert so provision one
        certData = await this.provisionOrFallback({ commonName, identifiers });
        this.log.info(`[anchor-pki] Certificate for ${commonName} provisioned.`);
        parsedData = JSON.parse(certData);
        managedCertificate = new ManagedCertificate({ ...parsedData });
        this.managedCertificates.set(commonName, managedCertificate);

        const wasCached = await this.cacheStore(commonName, certData);
        if (wasCached) {
            this.log.info(`[anchor-pki] Certificate for ${commonName} cached in (${this.cacheDir}).`);
        }

        return managedCertificate;
    }

    // provision the cert, but on an error fallback.
    async provisionOrFallback({ commonName, identifiers = null }) {
        try {
            return await this.provision({ commonName, identifiers });
        }
        catch (err) {
            commonName = this.fallbackIdentifier;
            return this.provision({ commonName, identifiers });
        }
    }

    async provision({ commonName, identifiers = null }) {
        const accountKey = await this.accountKey();

        const csrOpts = { commonName };
        if (identifiers) {
            csrOpts.altNames = [...identifiers];
        }
        const [keyBuf, csr] = await acme.crypto.createCsr(csrOpts);
        const key = keyBuf.toString();

        const clientOpts = {
            directoryUrl: this.directoryUrl,
            accountKey,
            externalAccountBinding: this.externalAccountBinding
        };

        const client = new acme.Client(clientOpts);
        const termsOfServiceUrl = await client.getTermsOfServiceUrl();
        let termsOfServiceAgreed = false;
        if (termsOfServiceUrl) {
            termsOfServiceAgreed = this.checkTermsOfService(termsOfServiceUrl);
            this.log.info(`[anchor-pki] Terms of service (${termsOfServiceUrl}) agreed : ${termsOfServiceAgreed}`);
        }
        else {
            termsOfServiceAgreed = true; // no tos so we agree
            if (typeof this.log.debug === 'function') {
                this.log.debug(`[anchor-pki] No Terms of Service exist so agreed : ${termsOfServiceAgreed}`);
            }
        }

        const cert = await client.auto({
            csr,
            termsOfServiceAgreed,
            email: this.contact
        });
        return JSON.stringify({ certPem: cert, keyPem: key });
    }

    checkTermsOfService(termsOfServiceUrl) {
        if (!termsOfServiceUrl) {
            return true;
        }
        const result = this.tosAcceptors.map((accept) => accept(termsOfServiceUrl))
            .some((r) => r);
        return result;
    }

    async accountKey() {
        const { host } = url.parse(this.directoryUrl, true);
        const cacheKey = [this.contact || 'default', host, 'key'].join('+');
        let key = await this.cacheFetch(cacheKey);
        if (!key) {
            key = await this.createAccountKey();
            await this.cacheStore(cacheKey, key);
        }
        return key;
    }

    async cacheFetch(key) {
        if (!this.cacheDir) {
            return null;
        }

        try {
            const object = await cacache.get(this.cacheDir, key);
            return object.data.toString();
        }
        catch (err) {
            return null;
        }
    }

    async cacheStore(key, data) {
        if (!this.cacheDir) {
            return null;
        }

        return cacache.put(this.cacheDir, key, data);
    }

    async cacheDelete(key) {
        if (!this.cacheDir) {
            return null;
        }

        return cacache.rm.entry(this.cacheDir, key);
    }

    async cacheClear() {
        if (!this.cacheDir) {
            return null;
        }

        return cacache.rm.all(this.cacheDir);
    }

    async createAccountKey() {
        return (await acme.crypto.createPrivateEcdsaKey()).toString();
    }

    deniedIdentifiers(identifiers) {
        if (identifiers === null) {
            return [];
        }
        const list = Array.isArray(identifiers) ? identifiers : [identifiers];

        // all policies must rejected the identifier for it to be denied.
        const denied = list.filter((identifier) => this.identifierPolicies.every((policy) => policy.deny(identifier)));
        return denied;
    }

    renewAfterFromSeconds(cert, beforeSeconds = this.renewBeforeSeconds) {
        if (!beforeSeconds) {
            return null;
        }

        const beforeMilliseconds = beforeSeconds * 1000;
        const renewAfterMilliseconds = cert.validToDate.valueOf() - beforeMilliseconds;

        // invalid if the cert renewAfter is not in the validity window of the
        // cert
        if (renewAfterMilliseconds < cert.validFromDate.valueOf()) {
            return null;
        }

        return new Date(renewAfterMilliseconds);
    }

    renewAfterFromFraction(cert, beforeFraction = this.renewBeforeFraction) {
        if ((beforeFraction === null) || (beforeFraction < 0.0) || (beforeFraction > 1.0)) {
            return null;
        }
        const validSpan = (cert.validToDate.valueOf() - cert.validFromDate.valueOf());
        const beforeMilliseconds = Math.floor(validSpan * beforeFraction);

        return this.renewAfterFromSeconds(cert, beforeMilliseconds / 1000);
    }

    renewAfterFallback(cert) {
        return this.renewAfterFromSeconds(cert, Manager.FALLBACK_RENEW_BEFORE_SECONDS);
    }

    needsRenewal(cert, now = new Date()) {
        const nowMilliseconds = now.valueOf();
        const possibilities = [
            this.renewAfterFromSeconds(cert),
            this.renewAfterFromFraction(cert),
            this.renewAfterFallback(cert),
            cert.validToDate
        ].filter(Boolean).map((date) => date.valueOf());

        const renewAfterMilliseconds = Math.min(...possibilities);
        return (nowMilliseconds > renewAfterMilliseconds);
    }
}

module.exports = {
    Manager,
    IdentifierNotAllowedError
};
/* eslint-enable max-classes-per-file */
