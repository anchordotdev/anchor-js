class PolicyCheck {
    static handles(_description) {
        throw new Error(`${this.name} must implement handles(description)`);
    }

    constructor(description) {
        this.policyDescription = description;
    }

    deny(identifier) {
        return !this.allow(identifier);
    }

    allow(_identifier) {
        throw new Error(`${this.constructor.name} must implement allow(identifier)`);
    }
}

module.exports = {
    PolicyCheck
};
