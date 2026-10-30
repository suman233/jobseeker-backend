module.exports = {
    appRoot: {
      env: process.env.NODE_ENV || "development",
      isProd: process.env.NODE_ENV === "production",
      host: process.env.HOST || "localhost",
      port: process.env.PORT || 3001,
      appName: process.env.APP_NAME || "blog",
      getApiFolderName: process.env.API_FOLDER_NAME || "api",
      getAdminFolderName: process.env.ADMIN_FOLDER_NAME || "admin",
    },
  };
  