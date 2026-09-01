import { PutObjectCommand } from "@aws-sdk/client-s3";
import { b2Client } from "./b2Client.js";

const uploadTestFile = async () => {
  try {
    const command = new PutObjectCommand({
      Bucket: process.env.B2_BUCKET_NAME,
      Key: "test/hello.txt",
      Body: "Hello from my video platform!",
      ContentType: "text/plain",
    });

    await b2Client.send(command);

    console.log("Test file uploaded successfully!");
  } catch (error) {
    console.error("Upload failed:");
    console.error(error);
  }
};

uploadTestFile();