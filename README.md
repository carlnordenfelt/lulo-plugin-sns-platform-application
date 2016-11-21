# lulo SNS Platform Application

lulo SNS Platform Application creates an Amazon SNS Platform Application.

lulo SNS Platform Application is a [lulo](https://github.com/carlnordenfelt/lulo) plugin

# Installation
```
$ npm install lulo-plugin-sns-platform-application --save
```

**NOTE:**
This resource only supports updates of the Attributes property! Other changes are ignored.

## Usage
### Properties
See the [AWS SDK Documentation for SNS::createPlatformApplication](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SNS.html#createPlatformApplication-property)

### Return Values
When the logical ID of this resource is provided to the Ref intrinsic function, Ref returns the Arn of the Platform Application.

`{ "Ref": "Application" }`

### Required IAM Permissions
The Custom Resource Lambda requires the following permissions for this plugin to work:
```
{
   "Effect": "Allow",
   "Action": [
       "sns:CreatePlatformApplication",
       "sns:DeletePlatformApplication",
       "sns:SetPlatformApplicationAttributes"
   ],
   "Resource": "*"
}
```

## License
[The MIT License (MIT)](/LICENSE)

## Change Log
[Change Log](/CHANGELOG.md)
