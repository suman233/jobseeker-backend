const { join, resolve } = require("path");
const express = require("express");
const ejs = require("ejs");
const path = require("path");
const dotenv = require("dotenv").config({ path: resolve(join(__dirname, ".env")) });
const connectDB = require("./app/config/db");
const session = require("express-session");
const flash = require("connect-flash");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const bodyParser = require("body-parser");
const morgan = require("morgan");

const app = express();
const namedRouter = require("route-label")(app);

// ****************** Import Configuration ********************
const appConfig = require(resolve(join(__dirname, "app/config", "index")));

// ***************** Import Utils ***********************
const utils = require(resolve(join(__dirname, "app/helper", "utils")));

// ****************** Application Configuration *********************
const getPort = process.env.PORT || appConfig.appRoot.port || 3002;
const getHost = process.env.HOST || appConfig.appRoot.host || "0.0.0.0";
const isProduction = process.env.NODE_ENV === "production" || appConfig.appRoot.isProd;
const getApiFolderName = appConfig.appRoot.getApiFolderName || "api";
const getAdminFolderName = appConfig.appRoot.getAdminFolderName || "admin";

// ******************** Global Function to Generate URLs for named routes ***********************
global.generateUrl = generateurl = (routeName, routeParams = {}) => {
  const url = namedRouter.urlFor(routeName, routeParams);
  return url;
};

// ******************* CORS Configuration for Vercel & Local *********************
const allowedOrigins = [
  process.env.FRONTEND_HOST,
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (!isProduction || allowedOrigins.includes(origin) || origin.endsWith(".vercel.app")) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  })
);

// ******************* Static Assets & Body Parsers *********************
app.use(express.static(resolve(join(__dirname, "public"))));
app.use("/public", express.static(resolve(join(__dirname, "public"))));
app.use("/uploads", express.static(resolve(join(__dirname, "uploads"))));

app.use(bodyParser.json({ limit: "50mb" }));
app.use(
  bodyParser.urlencoded({
    limit: "50mb",
    extended: true,
    parameterLimit: 50000,
  })
);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(morgan("dev"));

// ******************* Template Engine *********************
app.set("view engine", "ejs");
app.set("views", resolve(join(__dirname, "views")));
app.use(cookieParser());
app.use(
  session({
    secret:
      process.env.SESSION_SECRET ||
      process.env.JWT_ACCESS_TOKEN_SECRET_KEY ||
      "local-development-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
    },
  })
);
app.use(flash());

// ******************* Health Check for Render Deployment *********************
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    environment: process.env.NODE_ENV || "development",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ************************ Error Handling for Server ************************
const onError = (error) => {
  const port = getPort;
  if (error.syscall !== "listen") {
    throw error;
  }

  const bind = typeof port === "string" ? "Pipe " + port : "Port " + port;
  switch (error.code) {
    case "EACCES":
      console.error(bind + " requires elevated privileges");
      process.exit(1);
      break;
    case "EADDRINUSE":
      console.error(bind + " is already in use");
      process.exit(0);
      break;
    default:
      throw error;
  }
};

(async () => {
  try {
    console.log("STEP 1: Connecting to MongoDB...");
    await connectDB();
    console.log("STEP 1 SUCCESS");

    console.log("STEP 2: Loading API routes...");
    const apiFolderPath = resolve(join(__dirname, "app/router", getApiFolderName));
    const apiFiles = await utils._readdir(apiFolderPath);

    console.log("API Files:", apiFiles);

    apiFiles.forEach((file) => {
      if (!file || path.basename(file).startsWith(".")) return;

      console.log("Loading API route:", file);
      namedRouter.use("/api", require(file));
    });

    console.log("STEP 2 SUCCESS");

    console.log("STEP 3: Loading Admin routes...");
    const adminFolderPath = resolve(join(__dirname, "app/router", getAdminFolderName));
    const adminFiles = await utils._readdir(adminFolderPath);

    console.log("Admin Files:", adminFiles);

    adminFiles.forEach((file) => {
      if (!file || path.basename(file).startsWith(".")) return;

      console.log("Loading Admin route:", file);
      namedRouter.use("/", require(file));
    });

    console.log("STEP 3 SUCCESS");

    console.log("STEP 4: Building route table...");
    namedRouter.buildRouteTable();

    console.log("STEP 4 SUCCESS");

    console.log("STEP 5: Starting Express server...");

    const server = app.listen(getPort, "0.0.0.0", () => {
      console.log(`Backend running on port ${getPort}`);
    });

    server.on("error", onError);

  } catch (err) {
    console.error("APPLICATION STARTUP FAILED");
    console.error(err);
    console.error(err.stack);
    process.exitCode = 1;
  }
})();