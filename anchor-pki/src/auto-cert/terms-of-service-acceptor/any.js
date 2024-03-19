class Any {
    accept(_tosURI) {
        return true;
    }
}

const createAny = () => {
    const a = new Any();
    return a.accept.bind(a);
};


module.exports = {
    Any,
    createAny
};
