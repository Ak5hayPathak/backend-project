import crypto from "crypto";

const generateVerificationToken = () => {
    const token = crypto.randomBytes(32).toString("hex");

    const hashedToken = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

    const tokenExpires = new Date(Date.now() + 30 * 60 * 1000);

    return { token, hashedToken, tokenExpires };
};

export { generateVerificationToken };