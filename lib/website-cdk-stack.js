const { Stack, RemovalPolicy, Duration } = require('aws-cdk-lib');
const S3 = require('aws-cdk-lib/aws-s3');
const Cloudfront = require('aws-cdk-lib/aws-cloudfront');
const Route53 = require('aws-cdk-lib/aws-route53');
const Route53Targets = require("aws-cdk-lib/aws-route53-targets")
const CertificateManager = require('aws-cdk-lib/aws-certificatemanager')
const S3Deployer = require('aws-cdk-lib/aws-s3-deployment');
const lambda = require("aws-cdk-lib/aws-lambda");
const apigateway = require("aws-cdk-lib/aws-apigateway");
const iam = require("aws-cdk-lib/aws-iam");

const path = require('path');


// const sqs = require('aws-cdk-lib/aws-sqs');

class WebsiteCdkStack extends Stack {
  /**
   *
   * @param {Construct} scope
   * @param {string} id
   * @param {StackProps=} props
   */
  constructor(scope, id, props) {
    super(scope, id, props);
     // Define an S3 bucket
     const myBucket = new S3.Bucket(this, 'MyS3Bucket', {
      versioned: true, // Enable versioning for the bucket
      removalPolicy: RemovalPolicy.DESTROY, // Change to RETAIN to keep
      blockPublicAccess: S3.BlockPublicAccess.BLOCK_ALL,
    });

    const oai = new Cloudfront.OriginAccessIdentity(this, 'MyOAI');
    myBucket.grantRead(oai);    

    
    //Get our Route 53 Zone to use with Certificate Manager and Cloudfront
    const myHostedZone = Route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
      hostedZoneId: 'Z077348739ZZ6TG3KFI7D',
      zoneName: process.env.CDK_ROUTE_53_ZONE_NAME,
    })
    
    const certificate = new CertificateManager.Certificate(this, 'Certificate', {
      domainName: process.env.CDK_WEBSITE_DOMAIN,
      certificateName: process.env.CDK_WEBSITE_DOMAIN, // Optionally provide an certificate name
      validation: CertificateManager.CertificateValidation.fromDns(myHostedZone),
    });

    
    // Create CloudFront distribution with the S3 bucket as the origin
    const distribution = new Cloudfront.CloudFrontWebDistribution(this, 'MyCloudFrontDistribution', {      
      originConfigs: [
        {
          s3OriginSource: {
            s3BucketSource: myBucket,
            originAccessIdentity: oai,

          },
          behaviors: [{ isDefaultBehavior: true }],
        },
      ],
      viewerCertificate: {
        aliases: [process.env.CDK_WEBSITE_DOMAIN], // Replace with your domain alias
        props: {
          acmCertificateArn: certificate.certificateArn,
          sslSupportMethod: Cloudfront.SSLMethod.SNI,
        },
      },
      comment: "website 1" 
    });


    const aliasRecord = new Route53.ARecord(this, 'MyAliasRecord', {
      target: Route53.RecordTarget.fromAlias(new Route53Targets.CloudFrontTarget(distribution)),
      zone: myHostedZone,
      recordName: process.env.CDK_WEBSITE_DOMAIN,
    });

     
    // Deploy the S3 code
    new S3Deployer.BucketDeployment(this, 'DeployWebsite', {
      sources: [S3Deployer.Source.asset(path.join(__dirname, '../src/front-end-website'))],
      destinationBucket: myBucket,
      distribution,
      distributionPaths: ['/*'], //what paths should we invalidate when we deploy
      //destinationKeyPrefix: 'web/static', // optional prefix in destination bucket
    });


    const api = new apigateway.RestApi(this, 'website-backend-api', {
      restApiName: "website-backend-api",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key', 'X-Amz-Security-Token'],
      }
    });
    const deployment = new apigateway.Deployment(this, 'Deployment' + new Date().toISOString(), { api });
    const apiStage = new apigateway.Stage(this, `website-backend-stage`, {
      deployment,
      stageName: 'website-backend-stage'
    });

    //api key
    const apiKey = new apigateway.ApiKey(this, `website-backend-stage-key`, {
      apiKeyName: 'website-backend-stage-key',
    });

    //usage plan and add it all together
    const usagePlan = new apigateway.UsagePlan(this, `website-backend-usage-plan`, {
      name: "website-backend-usage-plan"
    });
    usagePlan.addApiStage({
      stage: apiStage
    });
    usagePlan.addApiKey(apiKey);

    //Lambda functions
    const websiteCDKLambdaFunction = new lambda.Function(this, 'test-lambda-function-websiteCDK', {
      runtime: lambda.Runtime.NODEJS_16_X,
      code: lambda.Code.fromAsset('src/lambda/test-lambda-function'),
      handler: 'index.handler',
      timeout: Duration.seconds(30),
      memorySize: 256,
      functionName: 'test-lambda-function-websiteCDK'
    });
    
    // Create an integration between the API Gateway and Lambda function
    const lambdaIntegration = new apigateway.LambdaIntegration(websiteCDKLambdaFunction);

    // Create a resource and associate it with the integration
    const functionAPIResource = api.root.addResource('website-cdk');
    functionAPIResource.addMethod('GET', lambdaIntegration, {
      apiKeyRequired: true,
    });

    //grant the permissions
    websiteCDKLambdaFunction.grantInvoke(new iam.ServicePrincipal('apigateway.amazonaws.com'));
    

  }

}


module.exports = { WebsiteCdkStack }
