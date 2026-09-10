import { Worker } from "bullmq";
import { redisConnection } from "../config/redis.js";

const videoWorker = new Worker(
  "video-processing",
  async (job) => {
    console.log("Processing job:", job.id);
    console.log("Job data:", job.data);
  },
  {
    connection: redisConnection,
  }
);

videoWorker.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});

videoWorker.on("failed", (job, error) => {
  console.error(`Job ${job?.id} failed:`, error);
});