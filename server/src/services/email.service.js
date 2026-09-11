import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD,
    },
});

const sendVerificationEmail = async (email, token) => {
    const verificationLink =
        `http://localhost:15000/api/v1/users/verify-email/${token}`;

    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Verify your email",
        html: `
            <h2>Verify your email</h2>
            <p>Click the link below to verify your email address:</p>

            <a href="${verificationLink}">
                Verify Email
            </a>

            <p>This link expires in 30 minutes.</p>
        `,
    });
};

export { sendVerificationEmail };