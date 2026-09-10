import { Queue } from "bullmq";
import { redisConnection } from "../config/redis.js";

const videoProcessingQueue = new Queue("video-processing", {
    connection: redisConnection,
});

export { videoProcessingQueue };