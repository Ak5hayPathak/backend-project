import { processVideo } from "../utils/processVideo.js";
import { uploadDirectoryToB2 } from "../utils/b2Uploader.js";
import { deleteDirectory } from "../utils/deleteLocalFiles.js";

const processAndUploadVideo = async (inputPath) => {
  try {
    const videoInfo = await processVideo(inputPath);

    const { videoId, outputDirectory, qualities, duration } = videoInfo;

    const videoFile = await uploadDirectoryToB2(outputDirectory, videoId);

    // Only delete after successful upload
    await deleteDirectory(outputDirectory);

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