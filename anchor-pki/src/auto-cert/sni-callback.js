const { Manager } = require('anchor-pki/auto-cert/manager');
const { Configuration } = require('anchor-pki/auto-cert/configuration');

const createSNICallback = (opts = Configuration.DEFAULT_OPTS) => {
    const manager = new Manager({ ...opts });
    return manager.sniCallback.bind(manager);
};

module.exports = {
    createSNICallback
};
