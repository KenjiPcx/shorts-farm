import { S3Client } from "@aws-sdk/client-s3";

if (!process.env.TIGRIS_AWS_REGION || !process.env.TIGRIS_AWS_ACCESS_KEY_ID || !process.env.TIGRIS_AWS_SECRET_ACCESS_KEY) {
    throw new Error("Tigris environment variables not set!");
}

export const tigris = new S3Client({
    endpoint: process.env.TIGRIS_AWS_ENDPOINT_URL_S3,
    region: process.env.TIGRIS_AWS_REGION,
    credentials: {
        accessKeyId: process.env.TIGRIS_AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.TIGRIS_AWS_SECRET_ACCESS_KEY,
    },
});

export const TIGRIS_BUCKET_NAME = process.env.TIGRIS_AWS_BUCKET_NAME!; 