import { processVideo } from "../utils/videoProcessor.js";
import {
  uploadDirectoryToB2,
  deleteVideoDirectoryFromB2,
} from "./b2.service.js";
import { uploadOnCloudinary } from "./cloudinary.service.js";
import { generateThumbnail } from "../utils/videoProcessor.js";
import { deleteLocalHLS } from "../utils/fileCleanup.js";
import { APIError } from "../utils/APIError.js";
import fs from "fs/promises";
import path from "path";

const processAndUploadVideo = async (inputPath, maxRetries = 5) => {
  let videoInfo;

  try {
    // Process the original video only once
    videoInfo = await processVideo(inputPath);

    const { videoId, outputDirectory, qualities, duration } = videoInfo;

    let videoFile;
    let lastError;

    // Retry only the upload process
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Uploading video to B2. Attempt ${attempt}/${maxRetries}`);

        videoFile = await uploadDirectoryToB2(outputDirectory, videoId);

        // Upload successful
        break;
      } catch (error) {
        lastError = error;

        console.error(`Upload attempt ${attempt} failed:`, error.message);

        // Delete partially uploaded files from B2
        try {
          await deleteVideoDirectoryFromB2(videoId);

          console.log(`Partial upload deleted for video: ${videoId}`);
        } catch (deleteError) {
          console.error(
            "Failed to delete partial upload:",
            deleteError.message
          );
        }

        // Stop retrying if we've reached max attempts
        if (attempt === maxRetries) {
          await fs.unlink(inputPath); //delete the hls from local storage
          throw lastError;
        }

        console.log("Retrying upload...");
      }
    }

    // Only delete local HLS after successful upload
    await deleteLocalHLS(outputDirectory);

    return {
      videoId,
      videoFile,
      qualities,
      duration,
    };
  } catch (error) {
    console.error("Video processing and upload failed:");
    console.error(error.message);
    throw error;
  }
};

const processAndUploadThumbnail = async (
  thumbnailLocalPath,
  videoFileLocalPath
) => {
  try {
    // Generate thumbnail if user didn't provide one
    if (!thumbnailLocalPath) {
      thumbnailLocalPath = path.join(
        "public",
        "temp",
        `thumbnail-${Date.now()}.jpg`
      );

      await generateThumbnail(videoFileLocalPath, thumbnailLocalPath);
    }

    // Upload thumbnail to Cloudinary
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if (!thumbnail) {
      throw new APIError(500, "Failed to upload thumbnail on Cloudinary!");
    }

    return thumbnail.url;
  } catch (error) {
    console.error("Thumbnail processing failed:", error.message);
    throw error;
  }
};

export { processAndUploadVideo, processAndUploadThumbnail };
