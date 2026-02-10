import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as digitalocean from "@pulumi/digitalocean";
import {BucketWebsite} from "./resources/Space";

// Create an AWS resource (S3 Bucket)
const bucket = new aws.s3.Bucket("test-bucket");

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
const s3Object = new aws.s3.BucketObject("index.html", {
    bucket: bucket.id,
    source: new pulumi.asset.FileAsset("./index.html"),
    contentType: "text/html",
    acl: "public-read"},
    {
        dependsOn: [publicAccessBlock, bucketOwnership]
    }
)

const staticWebsite = new aws.s3.BucketWebsiteConfiguration("website",
    {
        bucket: bucket.id,
        indexDocument: {
            suffix: "index.html"
        }
    },{dependsOn: [s3Object]}
)

// Create DigitalOcean Space
const staticWebsiteBucket = new digitalocean.SpacesBucket("static-site-example", {
    acl: 'public-read',
    name: "static-site-example",
    region: digitalocean.Region.NYC3,
});

const bucketRegion = staticWebsiteBucket.region.apply((region) => {
    if (!region) {
        throw new Error("region is not undefined");
    }
    return region;
})

const indexPageObj = new digitalocean.SpacesBucketObject("index", {
    region: bucketRegion,
    bucket: staticWebsiteBucket.id,
    key: "index.html",
    source: "./index.html",
    contentType: "text/html",
    acl: "public-read"
}, {dependsOn: [staticWebsiteBucket]})

const spaceStaticWebsiteConfig = new BucketWebsite(
    "space-website", {
        endpoint: staticWebsiteBucket.endpoint,
        bucket: staticWebsiteBucket.name,
        indexDocument :"index.html"
    }, {dependsOn: [indexPageObj]}
)


// Export the name of the bucket
export const bucketName = bucket.id;

export const endpoint = staticWebsite.websiteEndpoint;

export const spaceEndpoint = staticWebsiteBucket.bucketDomainName;