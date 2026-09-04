import dotenv from "dotenv";

dotenv.config({ path: "./server/.env" });

import { S3Client } from "@aws-sdk/client-s3";
console.log(process.env.B2_REGION);
const { getFileFromB2 } = await import("./b2Uploader.js");

const videoId = "fb67a5e7-a8f6-498a-b536-dbcdadad966b";
const key = `videos/${videoId}/master.m3u8`;

try {
  const response = await getFileFromB2(key);
  response.Body.pipe(res);

  // console.log("File retrieved successfully!");
  // console.log("Content Length:", response.ContentLength);
  // console.log("Content Type:", response.ContentType);
  // console.log("Body:", response.Body);

  for await (const chunk of response.Body) {
    console.log("Received chunk:", chunk.length, "bytes");
  }
} catch (error) {
  console.log("Failed to get file: ", error);
}
