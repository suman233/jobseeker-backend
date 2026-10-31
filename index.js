// ==============================================================================
// Node.js 24+ Compatibility Polyfill for legacy buffer-equal-constant-time / jwa
// ==============================================================================
const buffer = require("buffer");
if (!buffer.SlowBuffer) {
  buffer.SlowBuffer = buffer.Buffer;
}
if (buffer.SlowBuffer && !buffer.SlowBuffer.prototype) {
  buffer.SlowBuffer.prototype = buffer.Buffer.prototype;
}

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
const getApiFolderName = process.env.API_FOLDER_NAME || appConfig.appRoot.getApiFolderName || "api";
const getAdminFolderName = process.env.ADMIN_FOLDER_NAME || appConfig.appRoot.getAdminFolderName || "admin";

// ******************** Global Function to Generate URLs for named routes ***********************
global.generateUrl = generateurl = (routeName, routeParams = {}) => {
  const url = namedRouter.urlFor(routeName, routeParams);
  return url;
};

// ******************** Image URL Resolver Helper ***********************
const { getImageUrl } = require("./app/helper/commonHelper");
global.getImageUrl = getImageUrl;
app.locals.getImageUrl = getImageUrl;

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
app.use("/uploads/user", express.static(resolve(join(__dirname, "uploads/user"))));
app.use("/uploads/job", express.static(resolve(join(__dirname, "uploads/job"))));
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

// ******************* View Engine Locals Middleware *********************
app.use((req, res, next) => {
  res.locals.getImageUrl = getImageUrl;
  res.locals.generateUrl = global.generateUrl;
  app.locals.getImageUrl = getImageUrl;
  app.locals.generateUrl = global.generateUrl;
  next();
});

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
    await connectDB();

    // ************** API Routes ****************
    const apiFolderPath = resolve(join(__dirname, "app/router", getApiFolderName));
    const apiFiles = await utils._readdir(apiFolderPath);
    apiFiles.forEach((file) => {
      if (!file || path.basename(file).startsWith(".") || !file.endsWith(".js")) return;
      namedRouter.use("/api", require(file));
    });

    // ************** Admin Routes ****************
    const adminFolderPath = resolve(join(__dirname, "app/router", getAdminFolderName));
    const adminFiles = await utils._readdir(adminFolderPath);
    adminFiles.forEach((file) => {
      if (!file || path.basename(file).startsWith(".") || !file.endsWith(".js")) return;
      namedRouter.use("/", require(file));
    });

    // Building Route Table for Named Routes
    namedRouter.buildRouteTable();

    if (!isProduction && process.env.SHOW_NAMED_ROUTES === "true") {
      const apiRouteList = namedRouter.getRouteTable("/api");
      const userRouteList = namedRouter.getRouteTable("/");
      console.log("API Routes:", apiRouteList);
      console.log("User Routes:", userRouteList);
    }

    // ************ Server Setup ***********
    const server = app.listen(Number(getPort) || 3002, "0.0.0.0", () => {
      console.log(`Backend is running on http://${getHost}:${getPort}`);
    });

    server.on("error", onError);
  } catch (err) {
    console.error("Application startup failed:", err.message);
    console.error(err.stack);
    process.exit(1);
  }
})();
