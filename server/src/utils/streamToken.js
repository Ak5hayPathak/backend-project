import jwt from "jsonwebtoken";

const generateStreamToken = ({ userId, videoId, processingId }) => {
  return jwt.sign(
    {
      type: "stream",
      userId,
      videoId,
      processingId,
    },

    process.env.STREAM_TOKEN_SECRET,

    {
      expiresIn: process.env.STREAM_TOKEN_EXPIRY,
    }
  );
};

const verifyStreamToken = (token) => {
  return jwt.verify(token, process.env.STREAM_TOKEN_SECRET);
};

export { generateStreamToken, verifyStreamToken };
