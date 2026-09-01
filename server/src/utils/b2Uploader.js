import fs from "fs";
import path from "path";
import {
  PutObjectCommand,
  ListObjectVersionsCommand,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { b2Client } from "./b2Client.js";

const uploadFileToB2 = async (filePath, key) => {
  const fileStream = fs.createReadStream(filePath);

  await b2Client.send(
    new PutObjectCommand({
      Bucket: process.env.B2_BUCKET_NAME,
      Key: key,
      Body: fileStream,
    })
  );
};

//recursively collects and returns file paths from HLS directory
const getFilesRecursively = (directoryPath) => {
  const items = fs.readdirSync(directoryPath, {
    withFileTypes: true,
  });

  let files = [];

  for (const item of items) {
    const itemPath = path.join(directoryPath, item.name);

    if (item.isDirectory()) {
      files = files.concat(getFilesRecursively(itemPath));
    } else {
      files.push(itemPath);
    }
  }

  return files;
};

//delete files from backblaze to remove redundancy and delete videos
const deleteVideoDirectoryFromB2 = async (videoId) => {
  const prefix = `videos/${videoId}/`;

  let keyMarker;
  let versionIdMarker;

  try {
    do {
      const listResponse = await b2Client.send(
        new ListObjectVersionsCommand({
          Bucket: process.env.B2_BUCKET_NAME,
          Prefix: prefix,
          KeyMarker: keyMarker,
          VersionIdMarker: versionIdMarker,
        })
      );

      const objectsToDelete = [
        ...(listResponse.Versions || []),
        ...(listResponse.DeleteMarkers || []),
      ].map((object) => ({
        Key: object.Key,
        VersionId: object.VersionId,
      }));

      if (objectsToDelete.length > 0) {
        await b2Client.send(
          new DeleteObjectsCommand({
            Bucket: process.env.B2_BUCKET_NAME,
            Delete: {
              Objects: objectsToDelete,
              Quiet: false,
            },
          })
        );

        console.log(
          `Deleted ${objectsToDelete.length} file versions from B2`
        );
      }

      keyMarker = listResponse.NextKeyMarker;
      versionIdMarker = listResponse.NextVersionIdMarker;

    } while (keyMarker);

    console.log(`Deleted all existing versions for video: ${videoId}`);

  } catch (error) {
    console.error("Failed to delete video versions from B2: ");
    throw error;
  }
};

//to upload hls on backblaze
const uploadDirectoryToB2 = async (directoryPath, videoId, concurrency = 5) => {
  const files = getFilesRecursively(directoryPath);

  await deleteVideoDirectoryFromB2(videoId);

  for (let i = 0; i < files.length; i += concurrency) {
    const batch = files.slice(i, i + concurrency);

    await Promise.all(
      batch.map(async (filePath) => {
        const relativePath = path.relative(directoryPath, filePath);

        const key = path
          .join("videos", videoId, relativePath)
          .replace(/\\/g, "/");

        await uploadFileToB2(filePath, key);

        console.log(`Uploaded: ${key}`);
      })
    );
  }

  console.log("All files uploaded successfully!");
};

// const videoId = "f1d9ccf9-7f67-471d-a87b-b1cab3720124";

// const directoryPath = `./public/processed/${videoId}`;
// await uploadDirectoryToB2(directoryPath, videoId);

export {uploadDirectoryToB2, deleteVideoDirectoryFromB2};