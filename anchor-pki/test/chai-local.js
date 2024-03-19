const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);
chai.config.includeStack = true;
const assert = chai.assert;

const MockDate = require('mockdate');

// FIXME: didn't seem to fix test flake, but matches recording time
MockDate.set('Tue Nov 28 2023 16:41:20 GMT-0500');

module.exports = {
    assert
};
