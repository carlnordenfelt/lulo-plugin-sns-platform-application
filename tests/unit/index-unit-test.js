'use strict';

var expect = require('chai').expect;
var mockery = require('mockery');
var sinon = require('sinon');

describe('Index unit tests', function () {
    var subject;
    var createPlatformApplicationStub = sinon.stub();
    var deletePlatformApplicationStub = sinon.stub();
    var setPlatformApplicationAttributesStub = sinon.stub();
    var event;

    before(function () {
        mockery.enable({
            useCleanCache: true,
            warnOnUnregistered: false
        });

        var awsSdkStub = {
            SNS: function () {
                this.createPlatformApplication = createPlatformApplicationStub;
                this.deletePlatformApplication = deletePlatformApplicationStub;
                this.setPlatformApplicationAttributes = setPlatformApplicationAttributesStub;
            }
        };

        mockery.registerMock('aws-sdk', awsSdkStub);
        subject = require('../../src/index');
    });
    beforeEach(function () {
        createPlatformApplicationStub.reset().resetBehavior();
        createPlatformApplicationStub.yields(undefined, { PlatformApplicationArn: 'Arn' });
        deletePlatformApplicationStub.reset().resetBehavior();
        deletePlatformApplicationStub.yields();
        setPlatformApplicationAttributesStub.reset().resetBehavior();
        setPlatformApplicationAttributesStub.yields(undefined);

        event = {
            ResourceProperties: {
                Attributes: {},
                Platform: 'Platform',
                Name: 'Name'
            }
        };
    });
    after(function () {
        mockery.deregisterAll();
        mockery.disable();
    });

    describe('validate', function () {
        it('should succeed', function (done) {
            subject.validate(event);
            done();
        });
        it('should fail if Attributes is not set', function (done) {
            delete event.ResourceProperties.Attributes;
            function fn () {
                subject.validate(event);
            }
            expect(fn).to.throw(/Missing required property Attributes/);
            done();
        });
        it('should fail if Name is not set', function (done) {
            delete event.ResourceProperties.Name;
            function fn () {
                subject.validate(event);
            }
            expect(fn).to.throw(/Missing required property Name/);
            done();
        });
        it('should fail if Platform is not set', function (done) {
            delete event.ResourceProperties.Platform;
            function fn () {
                subject.validate(event);
            }
            expect(fn).to.throw(/Missing required property Platform/);
            done();
        });
    });

    describe('create', function () {
        it('should succeed', function (done) {
            event.ResourceProperties.Platform = 'APNS_SANDBOX';
            event.ResourceProperties.Attributes = {
                PlatformCredential: 'some text',
                PlatformPrincipal: 'some text'
            };
            subject.create(event, {}, function (error, response) {
                expect(error).to.equal(null);
                expect(createPlatformApplicationStub.calledOnce).to.equal(true);
                expect(deletePlatformApplicationStub.called).to.equal(false);
                expect(setPlatformApplicationAttributesStub.called).to.equal(false);
                expect(response.physicalResourceId).to.equal('Arn');
                done();
            });
        });
        it('should fail due to createPlatformApplication error', function (done) {
            createPlatformApplicationStub.yields('createPlatformApplication');
            subject.create(event, {}, function (error, response) {
                expect(error).to.equal('createPlatformApplication');
                expect(createPlatformApplicationStub.calledOnce).to.equal(true);
                expect(deletePlatformApplicationStub.called).to.equal(false);
                expect(setPlatformApplicationAttributesStub.called).to.equal(false);
                expect(response).to.equal(undefined);
                done();
            });
        });
    });

    describe('update', function () {
        var updateEvent;
        beforeEach(function () {
            updateEvent = JSON.parse(JSON.stringify(event));
            updateEvent.OldResourceProperties = JSON.parse(JSON.stringify(updateEvent.ResourceProperties));
            updateEvent.PhysicalResourceId = 'arn:aws:sns:eu-west-1:1234567890:app/test/test';
        });
        it('should succeed', function (done) {
            subject.update(updateEvent, {}, function (error) {
                expect(error).to.equal(undefined);
                expect(createPlatformApplicationStub.called).to.equal(false);
                expect(deletePlatformApplicationStub.called).to.equal(false);
                expect(setPlatformApplicationAttributesStub.calledOnce).to.equal(true);
                done();
            });
        });
        it('should succeed with APNS platform', function (done) {
            updateEvent.ResourceProperties.Platform = 'APNS';
            updateEvent.OldResourceProperties.Platform = 'APNS';
            updateEvent.ResourceProperties.Attributes = {
                PlatformCredential: 'some text',
                PlatformPrincipal: 'some text'
            };
            subject.update(updateEvent, {}, function (error) {
                expect(error).to.equal(undefined);
                expect(createPlatformApplicationStub.called).to.equal(false);
                expect(deletePlatformApplicationStub.called).to.equal(false);
                expect(setPlatformApplicationAttributesStub.calledOnce).to.equal(true);
                done();
            });
        });
        it('should fail on error', function (done) {
            setPlatformApplicationAttributesStub.yields('setPlatformApplicationAttributes');
            subject.update(updateEvent, {}, function (error) {
                expect(error).to.equal('setPlatformApplicationAttributes');
                expect(createPlatformApplicationStub.called).to.equal(false);
                expect(deletePlatformApplicationStub.called).to.equal(false);
                expect(setPlatformApplicationAttributesStub.calledOnce).to.equal(true);
                done();
            });
        });

        it('should succeed with replace', function (done) {
            updateEvent.ResourceProperties.Name = 'NewName';
            subject.update(updateEvent, {}, function (error) {
                expect(error).to.equal(null);
                expect(createPlatformApplicationStub.calledOnce).to.equal(true);
                expect(deletePlatformApplicationStub.calledOnce).to.equal(true);
                expect(setPlatformApplicationAttributesStub.called).to.equal(false);
                done();
            });
        });
        it('should fail on replace with create error', function (done) {
            updateEvent.ResourceProperties.Name = 'NewName';
            createPlatformApplicationStub.yields('createPlatformApplication');
            subject.update(updateEvent, {}, function (error) {
                expect(error).to.equal('createPlatformApplication');
                expect(createPlatformApplicationStub.calledOnce).to.equal(true);
                expect(deletePlatformApplicationStub.called).to.equal(false);
                expect(setPlatformApplicationAttributesStub.called).to.equal(false);
                done();
            });
        });
        it('should fail on replace with delete error', function (done) {
            updateEvent.ResourceProperties.Platform = 'NewPlatform';
            deletePlatformApplicationStub.yields('deletePlatformApplication');
            subject.update(updateEvent, {}, function (error) {
                expect(error).to.equal('deletePlatformApplication');
                expect(createPlatformApplicationStub.calledOnce).to.equal(true);
                expect(deletePlatformApplicationStub.calledOnce).to.equal(true);
                expect(setPlatformApplicationAttributesStub.called).to.equal(false);
                done();
            });
        });
    });

    describe('delete', function () {
        it('should succeed', function (done) {
            event.PhysicalResourceId = 'arn:aws:sns:eu-west-1:1234567890:app/test/test';
            subject.delete(event, {}, function (error, response) {
                expect(error).to.equal(undefined);
                expect(response).to.equal(undefined);
                expect(createPlatformApplicationStub.called).to.equal(false);
                expect(deletePlatformApplicationStub.calledOnce).to.equal(true);
                expect(setPlatformApplicationAttributesStub.called).to.equal(false);
                done();
            });
        });
        it('should fail due to deletePreset error', function (done) {
            event.PhysicalResourceId = 'arn:aws:sns:eu-west-1:1234567890:app/test/test';
            deletePlatformApplicationStub.yields({ code: 'deletePipeline' });
            subject.delete(event, {}, function (error, response) {
                expect(error.code).to.equal('deletePipeline');
                expect(createPlatformApplicationStub.called).to.equal(false);
                expect(deletePlatformApplicationStub.calledOnce).to.equal(true);
                expect(setPlatformApplicationAttributesStub.called).to.equal(false);
                expect(response).to.equal(undefined);
                done();
            });
        });
        it('should not fail if PhysicalResourceId is not an actual preset id', function (done) {
            event.PhysicalResourceId = 'PhysicalResourceId';
            subject.delete(event, {}, function (error, response) {
                expect(error).to.equal(undefined);
                expect(createPlatformApplicationStub.called).to.equal(false);
                expect(deletePlatformApplicationStub.called).to.equal(false);
                expect(setPlatformApplicationAttributesStub.called).to.equal(false);
                expect(response).to.equal(undefined);
                done();
            });
        });
    });
});
