// const { stat, readdir } = require("fs/promises");
// const { join } = require("path");

// // Define Utils Object
// const utils = {
//   isDirectory: async (filePath) => {
//     const fileStats = await stat(filePath);

//     return fileStats.isDirectory();
//   },

//   _readdir: async (filePath) => {
//     const files = await readdir(filePath);

//     const fileDetails = await Promise.all(
//       files.map(async (file) => {
//         const fullPath = join(filePath, file);

//         const isDir = await utils.isDirectory(fullPath);

//         if (isDir) {
//           return utils._readdir(fullPath);
//         } else {
//           return fullPath;
//         }
//       })
//     );
//     return fileDetails.flat();
//   },
// };

// module.exports = utils;

const { readdir } = require("fs/promises");
const { join } = require("path");

const utils = {
  _readdir: async (folderPath) => {
    const entries = await readdir(folderPath, {
      withFileTypes: true,
    });

    const results = await Promise.all(
      entries
        .filter((entry) => !entry.name.startsWith("."))
        .map(async (entry) => {
          const fullPath = join(folderPath, entry.name);

          if (entry.isDirectory()) {
            return utils._readdir(fullPath);
          }

          if (entry.isFile() && entry.name.endsWith(".js")) {
            return fullPath;
          }

          return [];
        })
    );

    return results.flat();
  },
};

module.exports = utils;
