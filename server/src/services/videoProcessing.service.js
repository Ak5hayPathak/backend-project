import { processVideo } from "../utils/videoProcessor.js";
import { uploadDirectoryToB2, deleteVideoDirectoryFromB2 } from "../utils/b2Uploader.js";
import { deleteLocalHLS } from "../utils/fileCleanup.js";

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

export { processAndUploadVideo };

