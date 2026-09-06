import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

const VideoPlayer = ({ videoId }) => {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);

  const [levels, setLevels] = useState([]);
  const [currentQuality, setCurrentQuality] = useState(-1);

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

      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLevels(hls.levels);
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        setCurrentQuality(data.level);
      });

      hls.loadSource(videoUrl);
      hls.attachMedia(video);

      return () => {
        hls.destroy();
        hlsRef.current = null;
        setLevels([]);
      };
    }

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = videoUrl;
    }
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