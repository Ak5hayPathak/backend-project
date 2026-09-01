import dotenv from "dotenv";
import { S3Client } from "@aws-sdk/client-s3";

dotenv.config();

console.log("B2_REGION:", process.env.B2_REGION);
console.log("B2_ENDPOINT:", process.env.B2_ENDPOINT);

//backblaze connection
const b2Client = new S3Client({
  endpoint: process.env.B2_ENDPOINT,

  region: process.env.B2_REGION,

  credentials: {
    accessKeyId: process.env.B2_KEY_ID,
    secretAccessKey: process.env.B2_APPLICATION_KEY,
  },
});

export { b2Client };