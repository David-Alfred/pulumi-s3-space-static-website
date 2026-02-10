import * as pulumi from "@pulumi/pulumi";
import * as aws from "@aws-sdk/client-s3"; // or any HTTP SDK



function sanitizeJSON(obj: any) {
  // Removes undefined and non-serializable types
  return JSON.parse(JSON.stringify(obj));
}

function getClientConfig(endpoint: string) {
  console.log(`The endpoint is ${endpoint}`);
  return {
    forcePathStyle: true, // Configures to use subdomain/virtual calling format.
    endpoint: `https://${endpoint}`,
    region: "us-east-1",
    credentials: {
      accessKeyId: process.env.SPACES_ACCESS_KEY_ID!,
      secretAccessKey: process.env.SPACES_SECRET_ACCESS_KEY!
    }  
  }
}



async function deleteWebsiteIndex(
  args: WebsiteArgs
) {

  const clientConfig = getClientConfig(args.endpoint);
  const s3Client = new aws.S3Client({
    ...clientConfig
  });

  const deleteCommand = {
    Bucket: args.bucket
  };

  try {
    const response = await s3Client.send(
      new aws.DeleteBucketWebsiteCommand(deleteCommand)
    );
  } catch (error) {
    console.error(error);
    throw new Error("failed to delete the index page");
  }
}

async function createWebsiteIndex(
  args: WebsiteArgs
) {
  const clientConfig = getClientConfig(args.endpoint);
  const s3Client = new aws.S3Client({
    ...clientConfig
  });

  const bucketWebsiteCommand = {
    Bucket: args.bucket,
    WebsiteConfiguration: {
      IndexDocument: {
        Suffix: args.indexDocument,
      },
      ...(args.errorDocument !== undefined
        ? {
            errorDocument: {
              Key: args.errorDocument,
            },
          }
        : {}),
    },
  };
  try {
    const response = await s3Client.send(
      new aws.PutBucketWebsiteCommand(bucketWebsiteCommand)
    );
    return response
  } catch (error) {
    console.error(error);
    throw new Error("failed to create the index page");
  }
}

async function getWebsiteIndex(
  args: WebsiteArgs
) {
  const clientConfig = getClientConfig(args.endpoint);
  const s3Client = new aws.S3Client({
    ...clientConfig
  });

  const getIndexCommand = {
    Bucket: args.bucket
  };

  try {
    const response = await s3Client.send(
      new aws.GetBucketWebsiteCommand(getIndexCommand)
    );
    return response;
  } catch (error) {
    console.error(error);
    throw new Error("failed to delete the index page");
  }
}



interface WebsiteArgs {
  endpoint: string;
  bucket: string;
  indexDocument: string;
  errorDocument?: string;
}

class WebsiteProvider implements pulumi.dynamic.ResourceProvider {
  async create(inputs: WebsiteArgs) {
    // Here you could call S3-compatible APIs like PutBucketWebsite
    // e.g., using @aws-sdk/client-s3 configured for the DigitalOcean Spaces endpoint.
    await createWebsiteIndex(inputs);

    // Example placeholder logic:
    console.log(`Configuring website for bucket ${inputs.bucket}`);

    const response = await getWebsiteIndex(inputs);
    // console.log(response);
    // Return an ID and outputs back to Pulumi
    return {
      id: `${inputs.bucket}-website`,
      outs: sanitizeJSON({
        bucket: inputs.bucket,
        indexDocument: inputs.indexDocument,
        errorDocument: inputs.errorDocument,
        endpoint: inputs.endpoint
      }),
    };
  }

  async update(id: string, olds: WebsiteArgs, news: WebsiteArgs) {
    // handle update if args changed
    await createWebsiteIndex(news)
    const response = await getWebsiteIndex(news);
    console.log(response);
    return { outs: sanitizeJSON({
      bucket: news.bucket,
      indexDocument: news.indexDocument,
      errorDocument: news.errorDocument,
      endpoint: news.endpoint
    }) };
  }

  async delete(id: string, props: WebsiteArgs) {
    await deleteWebsiteIndex(props);
  }
}

export interface WebsiteResourceArgs {
  endpoint: pulumi.Input<string>;
  bucket: pulumi.Input<string>;
  indexDocument: pulumi.Input<string>;
  errorDocument?: pulumi.Input<string>;
}

export class BucketWebsite extends pulumi.dynamic.Resource {
  constructor(
    name: string,
    args: WebsiteResourceArgs,
    opts?: pulumi.CustomResourceOptions
  ) {
    super(
      new WebsiteProvider(),
      name,
      {
        ...args,
      },
      opts
    );
  }
}
