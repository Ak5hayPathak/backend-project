import { useEffect, useRef, useState } from "react";

import Hls from "hls.js";

const VideoPlayer = ({ videoId }) => {
  const videoRef = useRef(null);

  const hlsRef = useRef(null);

  const streamTokenRef = useRef(null);

  const [levels, setLevels] = useState([]);

  const [currentQuality, setCurrentQuality] = useState(-1);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) return;

    let cancelled = false;

    let tokenRefreshInterval;

    const getStreamToken = async () => {
      const response = await fetch(
        `http://localhost:15000/api/v1/videos/${videoId}/stream-token`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to get stream token");
      }

      return data.data.token;
    };

    const initializePlayer = async () => {
      try {
        const streamToken = await getStreamToken();

        if (cancelled) return;

        streamTokenRef.current = streamToken;

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

                context.url = `http://localhost:15000/api/v1/videos/stream/${processingId}/${path}`;
              }

              return super.load(context, config, callbacks);
            }
          }

          const hls = new Hls({
            pLoader: CustomPlaylistLoader,

            xhrSetup: (xhr) => {
              xhr.withCredentials = true;

              xhr.setRequestHeader(
                "Authorization",
                `Bearer ${streamTokenRef.current}`
              );
            },
          });

          hlsRef.current = hls;

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            setLevels(hls.levels);
          });

          hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
            setCurrentQuality(data.level);
          });

          hls.loadSource(videoUrl);

          hls.attachMedia(video);

          // Refresh the stream token every 8 minutes.
          tokenRefreshInterval = setInterval(async () => {
            try {
              const newToken = await getStreamToken();

              if (!cancelled) {
                streamTokenRef.current = newToken;
                console.log("Stream token refreshed");
              }
            } catch (error) {
              console.error("Failed to refresh stream token:", error);
            }
          }, 8 * 60 * 1000);

          return () => {
            clearInterval(tokenRefreshInterval);

            hls.destroy();

            hlsRef.current = null;

            streamTokenRef.current = null;

            setLevels([]);
          };
        }

        if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = videoUrl;
        }
      } catch (error) {
        console.error("Failed to initialize video player:", error);
      }
    };

    initializePlayer();

    return () => {
      cancelled = true;

      if (tokenRefreshInterval) {
        clearInterval(tokenRefreshInterval);
      }
    };
  }, [videoId]);

  const handleQualityChange = (event) => {
    const level = Number(event.target.value);

    if (hlsRef.current) {
      hlsRef.current.currentLevel = level;

      setCurrentQuality(level);
    }
  };

  return (
    <div>
      <video ref={videoRef} controls width="400" />

      {levels.length > 0 && (
        <select value={currentQuality} onChange={handleQualityChange}>
          <option value={-1}>Auto</option>

          {levels.map((level, index) => (
            <option key={index} value={index}>
              {level.height}p
            </option>
          ))}
        </select>
      )}
    </div>
  );
};

export default VideoPlayer;