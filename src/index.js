'use strict';

var aws = require('aws-sdk');
var sns = new aws.SNS({ apiVersion: '2010-03-31' });

var pub = {};

pub.validate = function (event) {
    if (!event.ResourceProperties.Attributes) {
        throw new Error('Missing required property Attributes');
    }
    if (!event.ResourceProperties.Name) {
        throw new Error('Missing required property Name');
    }
    if (!event.ResourceProperties.Platform) {
        throw new Error('Missing required property Platform');
    }
};

pub.create = function (event, _context, callback) {
    delete event.ResourceProperties.ServiceToken;
    var params = event.ResourceProperties;

    if (event.ResourceProperties.Platform.indexOf('APNS') > -1) {
        event.ResourceProperties.Attributes.PlatformCredential.split(" ").join("\n"); // eslint-disable-line quotes
        event.ResourceProperties.Attributes.PlatformPrincipal.split(" ").join("\n"); // eslint-disable-line quotes
    }

    sns.createPlatformApplication(params, function (error, response) {
        if (error) {
            return callback(error);
        }

        var data = {
            physicalResourceId: response.PlatformApplicationArn
        };
        callback(null, data);
    });
};

pub.update = function (event, _context, callback) {
    var params = {
        PlatformApplicationArn: event.PhysicalResourceId,
        Attributes: event.ResourceProperties.Attributes
    };
    sns.setPlatformApplicationAttributes(params, function (error) {
        return callback(error);
    });
};

pub.delete = function (event, _context, callback) {
    if (!event.PhysicalResourceId.match(/^arn:aws:sns:[-0-9a-z]*:[0-9]*:app/)) {
        return setImmediate(callback);
    }

    var params = {
        PlatformApplicationArn: event.PhysicalResourceId
    };
    sns.deletePlatformApplication(params, function (error) {
        return callback(error);
    });
};

module.exports = pub;
