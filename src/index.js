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

    if (params.Platform.indexOf('APNS') > -1) {
        params.Attributes.PlatformCredential = fixCertPart(params.Attributes.PlatformCredential,
            '-----BEGIN PRIVATE KEY-----', '-----END PRIVATE KEY-----');
        params.Attributes.PlatformPrincipal = fixCertPart(params.Attributes.PlatformPrincipal,
            '-----BEGIN CERTIFICATE-----', '-----END CERTIFICATE-----');
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

pub.update = function (event, context, callback) {
    // Check if this change requires replacement
    if (requiresReplacement(event)) {
        return replace(event, context, callback);
    }

    // No replacement, just update existing platform
    var params = {
        PlatformApplicationArn: event.PhysicalResourceId,
        Attributes: event.ResourceProperties.Attributes
    };
    if (event.ResourceProperties.Platform.indexOf('APNS') > -1) {
        params.Attributes.PlatformCredential = fixCertPart(params.Attributes.PlatformCredential,
            '-----BEGIN PRIVATE KEY-----', '-----END PRIVATE KEY-----');
        params.Attributes.PlatformPrincipal = fixCertPart(params.Attributes.PlatformPrincipal,
            '-----BEGIN CERTIFICATE-----', '-----END CERTIFICATE-----');
    }
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

function fixCertPart(certPart, header, footer) {
    var fixedCertPart = certPart
        // Remove headers and footers, we'll re-add them later
        .replace(new RegExp(header, 'g'), 'CERT_HEADER_PLACEHOLDER')
        .replace(new RegExp(footer, 'g'), 'CERT_FOOTER_PLACEHOLDER')

        .replace(/\\n/g, '\n') // Replace escaped new line with proper new line
        .replace(/ /g, '\n') // Replace space with new line

        // Remove any extra newlines that have snuck in
        .replace(/CERT_HEADER_PLACEHOLDER\n/g, 'CERT_HEADER_PLACEHOLDER')
        .replace(/\nCERT_FOOTER_PLACEHOLDER/g, 'CERT_FOOTER_PLACEHOLDER')

        .replace(/CERT_HEADER_PLACEHOLDER/g, header + '\n') // Replace headers and footers
        .replace(/CERT_FOOTER_PLACEHOLDER/g, '\n' + footer);

    return fixedCertPart;
}

function requiresReplacement(event) {
    return event.ResourceProperties.Name !== event.OldResourceProperties.Name
        || event.ResourceProperties.Platform !== event.OldResourceProperties.Platform;
}

function replace(event, context, callback) {
    pub.create(event, context, function (error, data) {
        if (error) {
            return callback(error);
        }
        pub.delete(event, context, function (error) {
            if (error) {
                return callback(error);
            }
            return callback(null, data);
        });
    });
}
