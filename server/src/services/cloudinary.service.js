import fs from "fs";
import { cloudinary } from "../config/cloudinaryClient.js";

// Upload an image
const uploadOnCloudinary = async (localFilePath) => {
  if (!localFilePath) return null;

  try {
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    return response;
  } catch (err) {
    console.error("Cloudinary upload error:", err);
    return null;
  } finally {
    try {
      fs.unlinkSync(localFilePath);
    } catch (err) {
      console.error("Failed to delete local file:", err);
    }
  }
};

//Delete an image
const deleteFromCloudinary = async (imageUrl) => {
  if (!imageUrl) return;

  try {
    const parts = imageUrl.split("/");

    // Getting everything after the version
    const publicIdWithExtension = parts
      .slice(parts.indexOf(parts.find((part) => /^v\d+$/.test(part))) + 1)
      .join("/");

    // Removing the file extension
    const publicId = publicIdWithExtension.replace(/\.[^/.]+$/, "");

    const result = await cloudinary.uploader.destroy(publicId);

    console.log("Successfully Deleted!");
    return result;
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    throw error;
  }
};

export { uploadOnCloudinary, deleteFromCloudinary };
