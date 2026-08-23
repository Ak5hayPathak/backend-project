import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload an image
const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    //console.log("File has been uploaded successfully", response.url);
    fs.unlinkSync(localFilePath);
    return response;
    
  } catch (err) {
    console.error("Cloudinary upload error:", err);
    fs.unlinkSync(localFilePath);
    return null;
  }
};

//Delete an image
const deleteFromCloudinary = async (imageUrl) => {
  if (!imageUrl) return;

  try {
    const parts = imageUrl.split("/");

    // Getting everything after the version
    const publicIdWithExtension = parts.slice(parts.indexOf(
      parts.find(part => /^v\d+$/.test(part))
    ) + 1).join("/");

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

export {uploadOnCloudinary, deleteFromCloudinary};