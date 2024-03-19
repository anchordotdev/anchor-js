const tls = require('node:tls');
const { X509Certificate } = require('node:crypto');

class ManagedCertificate {
    certPem;

    keyPem;

    cert;

    certChain;

    #secureContext;

    #validFromDate;

    #validToDate;


    constructor({ certPem, keyPem }) {
        this.certPem = certPem;
        this.keyPem = keyPem;
        this.certChain = this.parseCertToChain(certPem);
        this.cert = new X509Certificate(this.certChain[0]);
        this.#secureContext = null;
        this.#validFromDate = new Date(this.cert.validFrom);
        this.#validToDate = new Date(this.cert.validTo);
    }

    get validTo() {
        return this.cert.validTo;
    }

    get validToDate() {
        return this.#validToDate;
    }

    get validFrom() {
        return this.cert.validFrom;
    }

    get validFromDate() {
        return this.#validFromDate;
    }

    // in node this is of the format: '0F70570FEF6DDB79E287C8E3'
    get serial() {
        return this.cert.serialNumber;
    }

    // keep the secure context for this certificate on the managed certificate
    // so it doesn't get recreated every request
    //
    secureContext() {
        if (this.#secureContext === null) {
            const params = {
                cert: this.certChain.slice(0, -1).join(''),
                ca: this.certChain[this.certChain.length - 1],
                key: this.keyPem
            };
            this.#secureContext = tls.createSecureContext(params);
        }
        return this.#secureContext;
    }

    hexSerial(joiner = ':') {
        const hex = this.serial.match(/.{2}/g).join(joiner);
        return hex;
    }

    parseCertToChain(pem) {
        const chain = [];
        let currentPem = '';
        pem.split('\n').forEach((line) => {
            currentPem += (`${line}\n`);
            if (line.match(/END CERTIFICATE/)) {
                chain.push(currentPem);
                currentPem = '';
            }
        });
        return chain;
    }

    // format 'DNS:anchor-pki-npm-testing.lcl.host, DNS:x.anchor-pki-npm-testing.lcl.host, DNS:y.anchor-pki-npm-testing.lcl.host'
    // Also, For the moment, the only items in subjectAltName we care about are
    // DNS: entries.
    get identifiers() {
        const altName = this.cert.subjectAltName;
        let names = [];
        if (typeof altName === 'string') {
            names = altName.split(', ')
                .filter((name) => name.startsWith('DNS:'))
                .map((name) => name.replace(/^DNS:/, ''));
        }
        return names;
    }

    // format is 'O=jeremy\nCN=anchor-pki-npm-testing.lcl.host'
    get commonName() {
        const values = this.cert.subject.split('\n');
        const cn = values.find((value) => value.match(/^CN=/));
        return cn ? cn.replace(/^CN=/, '') : null;
    }

    get allNames() {
        const names = [this.commonName, ...this.identifiers];
        const unique = [...new Set(names)];
        return unique;
    }
}

module.exports = {
    ManagedCertificate
};
