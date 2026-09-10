import "dotenv/config";
import connectDB from "../config/db.js";
import { Worker } from "bullmq";
import { redisConnection } from "../config/redis.js";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Notification } from "../models/notification.model.js";
import {
  processAndUploadVideo,
  processAndUploadThumbnail,
} from "../services/videoProcessing.service.js";
import { initializeSocketIO } from "../sockets/index.js";
import fs from "fs/promises";

await connectDB();

const videoWorker = new Worker(
  "video-processing",
  async (job) => {
    const { videoId, videoFileLocalPath, thumbnailLocalPath, username } =
      job.data;

    console.log(`Processing video job: ${job.id}`);

    try {
      // 1. Process and upload thumbnail
      const thumbnailURL = await processAndUploadThumbnail(
        thumbnailLocalPath,
        videoFileLocalPath
      );

      console.log("Thumbnail processing completed");

      // 2. Process video and upload HLS files to B2
      const { videoFile, qualities, duration } =
        await processAndUploadVideo(videoFileLocalPath);

      console.log("Video processing completed");

      // 3. Update video document
      const video = await Video.findByIdAndUpdate(
        videoId,
        {
          thumbnail: thumbnailURL,
          videoFile,
          qualities,
          duration,
          processingStatus: "ready",
          isPublished: true,
        },
        { returnDocument: "after" }
      );

      if (!video) {
        throw new Error("Video document not found");
      }

      console.log(`Video ${videoId} is ready`);

      const io = initializeSocketIO();

      // 4. Notify uploader that processing is complete
      io.to(`userId:${video.owner}`).emit("video-processing-completed", {
        videoId: video._id,
        status: "ready",
      });

      // 5. Find subscribers
      const subscriptions = await Subscription.find({
        channel: video.owner,
      }).select("subscriber");

      if (subscriptions.length > 0) {
        // 6. Create database notifications
        const notifications = subscriptions.map((subscription) => ({
          recipient: subscription.subscriber,
          sender: video.owner,
          type: "new_video",
          message: `${username} posted a new video`,
          resource: video._id,
        }));

        await Notification.insertMany(notifications);

        // 7. Send real-time notifications to subscribers
        for (const subscription of subscriptions) {
          io.to(`userId:${subscription.subscriber}`).emit("notification", {
            recipient: subscription.subscriber,
            sender: video.owner,
            type: "new_video",
            message: `${username} posted a new video`,
            resource: video._id,
          });
        }
      }

      console.log("Subscriber notifications sent");
      await fs.unlink(videoFileLocalPath);

      return {
        videoId,
        videoFile,
        thumbnailURL,
        qualities,
        duration,
      };
    } catch (error) {
      // Mark video as failed
      const video = await Video.findByIdAndUpdate(
        videoId,
        { processingStatus: "failed" },
        { returnDocument: "after" }
      );

      if (video) {
        // Notify uploader that processing failed
        const io = initializeSocketIO();

        io.to(`userId:${video.owner}`).emit("video-processing-failed", {
          videoId: video._id,
          status: "failed",
        });
      }

      console.error(`Video processing failed for ${videoId}:`, error.message);

      throw error;
    }
  },
  {
    connection: redisConnection,
  }
);

videoWorker.on("completed", (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

videoWorker.on("failed", (job, error) => {
  console.error(`Job ${job?.id} failed:`, error.message);
});
