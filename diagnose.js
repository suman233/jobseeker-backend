const { join, resolve } = require("path");
const path = require("path");
const dotenv = require("dotenv").config({ path: resolve(join(__dirname, ".env")) });
const express = require("express");

console.log("1. Starting diagnosis...");

try {
  console.log("2. Testing express and namedRouter initialization...");
  const app = express();
  const namedRouter = require("route-label")(app);
  console.log("   namedRouter created successfully.");

  console.log("3. Testing appConfig import...");
  const appConfig = require(resolve(join(__dirname, "app/config", "index")));
  console.log("   appConfig:", appConfig);

  console.log("4. Testing utils import...");
  const utils = require(resolve(join(__dirname, "app/helper", "utils")));
  console.log("   utils loaded.");

  const getApiFolderName = process.env.API_FOLDER_NAME || appConfig.appRoot.getApiFolderName || "api";
  const getAdminFolderName = process.env.ADMIN_FOLDER_NAME || appConfig.appRoot.getAdminFolderName || "admin";

  (async () => {
    try {
      console.log("5. Testing api files reading from:", getApiFolderName);
      const apiFolderPath = resolve(join(__dirname, "app/router", getApiFolderName));
      const apiFiles = await utils._readdir(apiFolderPath);
      console.log("   Found api files:", apiFiles);

      for (const file of apiFiles) {
        if (!file || path.basename(file).startsWith(".")) continue;
        console.log("   Loading API router file:", file);
        const routerModule = require(file);
        console.log("   Exported from", path.basename(file), ":", typeof routerModule);
        namedRouter.use("/api", routerModule);
      }

      console.log("6. Testing admin files reading from:", getAdminFolderName);
      const adminFolderPath = resolve(join(__dirname, "app/router", getAdminFolderName));
      const adminFiles = await utils._readdir(adminFolderPath);
      console.log("   Found admin files:", adminFiles);

      for (const file of adminFiles) {
        if (!file || path.basename(file).startsWith(".")) continue;
        console.log("   Loading Admin router file:", file);
        const routerModule = require(file);
        console.log("   Exported from", path.basename(file), ":", typeof routerModule);
        namedRouter.use("/", routerModule);
      }

      console.log("7. Testing buildRouteTable...");
      namedRouter.buildRouteTable();
      console.log("   buildRouteTable succeeded!");

      console.log("8. Testing route table retrieval...");
      const apiRouteList = namedRouter.getRouteTable("/api");
      const userRouteList = namedRouter.getRouteTable("/");
      console.log("   API Routes count:", Object.keys(apiRouteList).length);
      console.log("   User Routes count:", Object.keys(userRouteList).length);

      console.log("\n>>> ALL ROUTER STEPS SUCCEEDED LOCALLY! <<<\n");
    } catch (innerErr) {
      console.error("\n*** ERROR DURING ASYNC ROUTE LOADING ***");
      console.error("Message:", innerErr.message);
      console.error("Stack:", innerErr.stack);
    }
  })();
} catch (outerErr) {
  console.error("\n*** ERROR DURING SYNCHRONOUS SETUP ***");
  console.error("Message:", outerErr.message);
  console.error("Stack:", outerErr.stack);
}

