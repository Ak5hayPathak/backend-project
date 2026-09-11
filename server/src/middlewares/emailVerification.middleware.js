import { APIError } from "../utils/APIError.js";

const isEmailVerified = (req, res, next) => {
  if (!req.user) {
    throw new APIError(401, "User is not authenticated");
  }

  if (!req.user.isEmailVerified) {
    throw new APIError(
      403,
      "Please verify your email before accessing this resource"
    );
  }

  next();
};

export { isEmailVerified };
