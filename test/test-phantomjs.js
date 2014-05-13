var async   = require('async'),
    chai    = require('chai');

var should = chai.should,
    expect = chai.expect;

describe("The main page", function () {
    var main = document.getElementById('main');

    it("should have more than a dozen fonts", function () {
        expect(main.querySelectorAll('div').length).to.be.above(12);
    });
});