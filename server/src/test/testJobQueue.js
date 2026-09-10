import { videoProcessingQueue } from "../queues/video.queue.js";

const job = await videoProcessingQueue.add("test-video", {
  videoId: "12345",
  message: "Hello BullMQ!",
});

console.log("Job added:", job.id);