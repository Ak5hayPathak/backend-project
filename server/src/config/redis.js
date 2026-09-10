import Redis from "ioredis";

const redisConnection = new Redis({
    host: process.env.REDIS_HOST ?? "127.0.0.1", 
    port: process.env.REDIS_PORT ?? 6379,
});

redisConnection.on("connect", () => {
    console.log("Redis Connected!");
});

redisConnection.on("error", (error) => {
    console.error("Redis connection error: ", error);
});

export {redisConnection};