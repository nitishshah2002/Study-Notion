const cloudinary = require("cloudinary").v2;
const fs = require("fs");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadToCloudinary = async (filePath, folder, publicId) => {
  try {
    const options = { folder };
    if (publicId) options.public_id = publicId;

    const result = await cloudinary.uploader.upload(filePath, options);

    fs.unlinkSync(filePath); // Clean up local file
    return result;
  } catch (error) {
    console.error("Cloudinary Upload Failed:", error);
    throw error;
  }
};

module.exports = { uploadToCloudinary };
