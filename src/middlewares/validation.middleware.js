import {
  isValidEmail,
  isValidUsername,
  isValidPassword,
  isValidPhone,
  isValidFullName,
} from "../utils/validation.js";

const validateRegisterUser = (req, res, next) => {
  const { fullName, email, username, phone, password } = req.body;

  if (!isValidFullName(fullName)) {
    throw new APIError(400, "Invalid full name");
  }

  if (!isValidEmail(email)) {
    throw new APIError(400, "Invalid email");
  }

  if (!isValidUsername(username)) {
    throw new APIError(
      400,
      "Username must be 3-20 characters and contain only letters, numbers, and underscores"
    );
  }

  if (!isValidPhone(phone)) {
    throw new APIError(400, "Invalid phone number");
  }

  if (!isValidPassword(password)) {
    throw new APIError(
      400,
      "Password must be at least 8 characters and contain uppercase, lowercase, and a number"
    );
  }

  next();
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
