import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import crypto from "crypto";

//video resolutions available to generate
const AVAILABLE_QUALITIES = [
  //144p
  {
    name: "144p",
    height: "144",
    width: "256",
    bitrate: "150k",
    bandwidth: 150000,
  },

  //240p
  {
    name: "240p",
    height: "240",
    width: "426",
    bitrate: "300k",
    bandwidth: 300000,
  },

  //360p
  {
    name: "360p",
    height: "360",
    width: "640",
    bitrate: "500k",
    bandwidth: 500000,
  },

  //720p
  {
    name: "720p",
    height: "720",
    width: "1280",
    bitrate: "1500k",
    bandwidth: 1500000,
  },

  //1080p
  {
    name: "1080p",
    height: "1080",
    width: "1920",
    bitrate: "3000k",
    bandwidth: 3000000,
  },

  //1440p
  {
    name: "2K",
    height: 1440,
    width: 2560,
    bitrate: "6000k",
    bandwidth: 6000000,
  },

  //1800p
  {
    name: "3K",
    height: 1800,
    width: 3200,
    bitrate: "10000k",
    bandwidth: 10000000,
  },

  //2160p
  {
    name: "4K",
    height: 2160,
    width: 3840,
    bitrate: "15000k",
    bandwidth: 15000000,
  },
];

//determination of qualities that can be generated from
// the uploaded video based on its height
const getSupportedQualities = (videoHeight) => {
  return AVAILABLE_QUALITIES.filter((quality) => quality.height <= videoHeight);
};

//get video metadata using runFFprobe
const runFFprobe = (filePath) => {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn("ffprobe", [
      "-v",
      "quiet",
      //Hide unnecessary logs

      "print_format",
      "json",
      //Return the result as JSON

      "-show_format",
      //Get general file information
      // (duration, size, bitrate, etc.)

      "-show_streams",
      //Get information about video/audio streams
      // (resolution, codec, fps, etc.)

      filePath,
      //The video file to analyze
    ]);

    let output = "";
    let errorOutput = "";

    // data coming from the standard output (stdout)
    // of the ffProbe process. by the time FFprobe finishes
    // output contains the complete JSON metadata produced by FFprobe.
    ffprobe.stdout.on("data", (data) => {
      output += data.toString();
    });

    // Collect error output from FFprobe
    ffprobe.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    ffprobe.on("error", (error) => {
      reject(error);
    });

    ffprobe.on("close", (code) => {
      if (code === 0) {
        try {
          const metadata = JSON.parse(output);
          resolve(metadata);
        } catch (error) {
          reject(error);
        }
      } else {
        reject(
          new Error(`FFprobe failed with exit code ${code}\n${errorOutput}`)
        );
      }
    });
  });
};

// Run FFmpeg and handle its completion with a Promise
const runFFmpeg = (args) => {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", args);

    let errorOutput = "";

    ffmpeg.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    ffmpeg.on("error", (error) => {
      reject(error);
    });

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(`FFmpeg failed with exit code ${code}\n${errorOutput}`)
        );
      }
    });
  });
};

// generates an HLS version of the video for a specific quality
const generateVideoQuality = async (inputPath, quality, videoId) => {
  const qualityDirectory = path.join("output", videoId, quality.name);

  fs.mkdirSync(qualityDirectory, {
    recursive: true,
  });

  const playlistPath = path.join(qualityDirectory, "playlist.m3u8");
  const segmentPath = path.join(qualityDirectory, "segment%d.ts");

  await runFFmpeg([
    "-i",
    inputPath,
    //Input video file

    "-vf",
    `scale=-2:${quality.height}`,
    //resized the video

    "-c:v",
    "libx264",
    //uses the H.264 video codec

    "-b:v",
    quality.bitrate,
    //sets the video bitrate

    "-c:a",
    "aac",
    //uses AAC audio encoding

    "-b:a",
    "128k",
    //sets audio bitrate to 128 kbps

    "-hls_time",
    "4",
    //creates HLS segments of approximately 4 seconds

    "-force_key_frames",
    "expr:gte(t,n_forced*4)",
    // forces keyframes approximately every 4 seconds
    // so the video can be segmented properly

    "-hls_list_size",
    "0",
    //keeps all segments in the playlist

    "-hls_segment_filename",
    segmentPath,
    //tells FFmpeg where to save the .ts segment files

    playlistPath,
    //the final output playlist
  ]);

  console.log(`${quality.name} generated successfully!`);
};

