const express = require("express");
const router = express.Router();
const routerLabel = require("route-label");
const UserController = require("../../../webservice/auth/UserController");
const namedRouter = routerLabel(router);

// User Authentication & Registration APIs
namedRouter.post("user-login", "/user-login", UserController.loginUser);
namedRouter.post("user-register", "/user-register", UserController.registerUser);
namedRouter.post("user-signup", "/user-signup", UserController.registerUser);
namedRouter.post("send-email-otp", "/send-email-otp", UserController.sendEmailOtp);
namedRouter.post("send-signup-otp", "/send-signup-otp", UserController.sendEmailOtp);
namedRouter.post("verify-email-otp", "/verify-email-otp", UserController.verifyEmailOtp);
namedRouter.post("verify-signup-otp", "/verify-signup-otp", UserController.verifyEmailOtp);
namedRouter.post("verify-otp", "/verify-otp", UserController.verifyOtp);
namedRouter.post("resend-otp", "/resend-otp", UserController.resendOtp);
namedRouter.get("user-profile", "/user-profile", UserController.getUserProfile);

module.exports = router;
