const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadToCloudinary = async (filePath, folder, publicId) => {
  return await cloudinary.uploader.upload(filePath, {
    folder: folder || "StudyNotion",
    public_id: publicId || undefined,
    resource_type: "auto",
  });
};

module.exports = { uploadToCloudinary };
