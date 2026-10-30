const { stat, readdir } = require("fs/promises");
const { join } = require("path");

// Define Utils Object
const utils = {
  isDirectory: async (filePath) => {
    const fileStats = await stat(filePath);

    return fileStats.isDirectory();
  },

  _readdir: async (filePath) => {
    const files = await readdir(filePath);

    const fileDetails = await Promise.all(
      files.map(async (file) => {
        const fullPath = join(filePath, file);

        const isDir = await utils.isDirectory(fullPath);

        if (isDir) {
          return utils._readdir(fullPath);
        } else {
          return fullPath;
        }
      })
    );
    return fileDetails.flat();
  },
};

module.exports = utils;
