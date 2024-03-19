class Regex {
    #regex;

    constructor(regex) {
        this.#regex = regex;
    }

    get regex() { return this.#regex; }

    accept(tosURI) {
        return this.#regex.test(tosURI);
    }
}

const createRegex = (regex) => {
    const r = new Regex(regex);
    return r.accept.bind(r);
};

module.exports = {
    Regex,
    createRegex
};
