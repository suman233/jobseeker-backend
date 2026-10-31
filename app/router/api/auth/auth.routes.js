const express = require("express");
const router = express.Router();
const routerLabel = require("route-label");
const UserController = require("../../../webservice/auth/UserController");
const ImageUpload = require("../../../helper/imageUpload");
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

// User Management CRUD APIs (List, Get, Update, Delete)
namedRouter.get("api-users-list", "/users", UserController.getAllUsers);
namedRouter.get("api-users-list-alt", "/user-list", UserController.getAllUsers);
namedRouter.get("api-user-detail", "/users/:id", UserController.getUserById);
namedRouter.get("api-user-detail-alt", "/user-details/:id", UserController.getUserById);

namedRouter.put("api-user-update-put", "/users/:id", ImageUpload.single("image"), UserController.updateUser);
namedRouter.post("api-user-update-post", "/user-update/:id", ImageUpload.single("image"), UserController.updateUser);

namedRouter.delete("api-user-delete", "/users/:id", UserController.deleteUser);
namedRouter.delete("api-user-delete-alt", "/user-delete/:id", UserController.deleteUser);
namedRouter.get("api-user-delete-get", "/user-delete/:id", UserController.deleteUser);

module.exports = router;
