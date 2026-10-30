const express = require("express");
const router = express.Router();
const routerLabel = require("route-label");
const UserController = require("../../../webservice/auth/UserController");
const namedRouter = routerLabel(router);

// User Authentication & Registration APIs
namedRouter.post("user-login", "/user-login", UserController.loginUser);
namedRouter.post("user-register", "/user-register", UserController.registerUser);
namedRouter.post("user-signup", "/user-signup", UserController.registerUser);
namedRouter.post("verify-otp", "/verify-otp", UserController.verifyOtp);
namedRouter.post("resend-otp", "/resend-otp", UserController.resendOtp);
namedRouter.get("user-profile", "/user-profile", UserController.getUserProfile);

module.exports = router;
