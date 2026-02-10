import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

// Create an AWS resource (S3 Bucket)
const bucket = new aws.s3.BucketV2("test-bucket");

const bucketOwnership = new aws.s3.BucketOwnershipControls("ownership-control", {
    bucket: bucket.id,
    rule: {
        objectOwnership: "ObjectWriter"
    }
})
const publicAccessBlock = new aws.s3.BucketPublicAccessBlock("public-access-block", {
    bucket: bucket.id,
    blockPublicAcls: false,
});
// Create a S3 bucket object
const s3Object = new aws.s3.BucketObjectv2("index.html", {
    bucket: bucket.id,
    source: new pulumi.asset.FileAsset("./index.html"),
    contentType: "text/html",
    acl: "public-read"},
    {
        dependsOn: [publicAccessBlock, bucketOwnership]
    }
)

const staticWebsite = new aws.s3.BucketWebsiteConfigurationV2("website",
    {
        bucket: bucket.id,
        indexDocument: {
            suffix: "index.html"
        }
    },{dependsOn: [s3Object]}
)
// Export the name of the bucket
export const bucketName = bucket.id;

export const endpoint = staticWebsite.websiteEndpoint;
