const path = require("path");
const multer = require("multer");

const FILE_TYPE = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/jpg": "jpg",
};

const uploadDir = path.resolve(__dirname, "../../uploads");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const isValid = FILE_TYPE[file.mimetype];
    let uploadError = new Error("Invalid Image type");

    if (isValid) {
      uploadError = null;
    }
    cb(uploadError, uploadDir);
  },
  filename: function (req, file, cb) {
    const extension = FILE_TYPE[file.mimetype];
    const originalName = file.originalname.split(" ").join("-");
    cb(null, `${Date.now()}.${extension}`);
  },
});

const ImageUpload = multer({ storage: storage });

module.exports = ImageUpload;
