import {
  isValidEmail,
  isValidUsername,
  isValidPassword,
  // isValidPhone,
  isValidFullName,
} from "../utils/validation.js";
import { APIError } from "../utils/APIError.js";
import { deleteLocalFiles } from "../utils/fileCleanup.js";

const validateRegisterUser = async (req, res, next) => {
  try {
    const { fullName, email, username, password } = req.body;

    if (!isValidFullName(fullName)) {
      await deleteLocalFiles(req.files);
      throw new APIError(400, "Invalid full name");
    }

    if (!isValidEmail(email)) {
      await deleteLocalFiles(req.files);
      throw new APIError(400, "Invalid email");
    }

    if (!isValidUsername(username)) {
      await deleteLocalFiles(req.files);
      throw new APIError(
        400,
        "Username must be 3-20 characters and contain only letters, numbers, underscores and dots"
      );
    }

    // if (!isValidPhone(phone)) {
    //   await deleteLocalFiles(req.files);
    //   throw new APIError(400, "Invalid phone number");
    // }

    if (!isValidPassword(password)) {
      await deleteLocalFiles(req.files);
      throw new APIError(
        400,
        "Password must be at least 8 characters and contain uppercase, lowercase, and a number"
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};

const validateLoginUser = (req, res, next) => {
  const { username, email } = req.body;

  if (!username && !email) {
    throw new APIError(400, "Username or email is required");
  }

  if (username && !isValidUsername(username.trim())) {
    throw new APIError(400, "Invalid username");
  }

  if (email && !isValidEmail(email.trim())) {
    throw new APIError(400, "Invalid email");
  }

  next();
};

export { validateLoginUser, validateRegisterUser };
