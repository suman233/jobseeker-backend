const path = require("path");
const fs = require("fs");
const multer = require("multer");

const FILE_TYPE = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

const uploadsRoot = path.resolve(__dirname, "../../uploads");
const userUploadDir = path.resolve(uploadsRoot, "user");
const jobUploadDir = path.resolve(uploadsRoot, "job");

// Ensure destination directories exist
if (!fs.existsSync(userUploadDir)) fs.mkdirSync(userUploadDir, { recursive: true });
if (!fs.existsSync(jobUploadDir)) fs.mkdirSync(jobUploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const isValid = FILE_TYPE[file.mimetype];
    const uploadError = isValid
      ? null
      : new Error("Invalid Image type. Allowed types: PNG, JPEG, JPG, WEBP, SVG");

    // Route job logos to 'uploads/job', user photos to 'uploads/user'
    const isJob =
      file.fieldname === "companyLogo" ||
      file.fieldname.toLowerCase().includes("logo") ||
      (req.originalUrl && req.originalUrl.includes("job"));

    const targetDir = isJob ? jobUploadDir : userUploadDir;
    cb(uploadError, targetDir);
  },
  filename: function (req, file, cb) {
    const extension = FILE_TYPE[file.mimetype] || "jpeg";
    cb(null, `${Date.now()}.${extension}`);
  },
});

const ImageUpload = multer({ storage: storage });

module.exports = ImageUpload;
