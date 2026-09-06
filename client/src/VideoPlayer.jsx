import { useEffect, useRef } from "react";
import Hls from "hls.js";

const VideoPlayer = ({ videoId }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) return;

    const videoUrl = `http://localhost:15000/api/v1/videos/${videoId}/stream`;

    if (Hls.isSupported()) {
      class CustomPlaylistLoader extends Hls.DefaultConfig.loader {
        load(context, config, callbacks) {
          const url = context.url;

          const match = url.match(
            /\/api\/v1\/videos\/[^/]+\/([a-f0-9-]+)\/(.+)$/
          );

          if (match) {
            const [, processingId, path] = match;

            context.url =
              `http://localhost:15000/api/v1/videos/stream/${processingId}/${path}`;

            console.log("Rewritten HLS URL:", context.url);
          }

          return super.load(context, config, callbacks);
        }
      }

      const hls = new Hls({
        pLoader: CustomPlaylistLoader,

        xhrSetup: (xhr) => {
          xhr.withCredentials = true;
        },
      });

      hls.loadSource(videoUrl);
      hls.attachMedia(video);

      return () => {
        hls.destroy();
      };
    }

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = videoUrl;
    }
  }, [videoId]);

  return <video ref={videoRef} controls width="720" />;
};

export default VideoPlayer;