const express = require("express");
const router = express.Router();
const routerLabel = require("route-label");
const authController = require("../../module/auth/controller/authController");
const requireUser = require("../../middleware/requireUser");
const namedRouter = routerLabel(router);

namedRouter.get("admin-login-page", "/admin/login", authController.loginPage);
namedRouter.get("admin-register-page", "/admin/register", authController.registerPage);
namedRouter.post("admin-register", "/admin/register", authController.adminRegister);
namedRouter.get("logout", "/admin/logout", authController.logout);
namedRouter.post("admin-login", "/admin/login", authController.adminLogin);
namedRouter.get("user-login-page", "/login", authController.userLoginPage);
namedRouter.post("user-login-form", "/login", authController.userLogin);
namedRouter.get("user-account", "/account", requireUser, authController.userHome);
namedRouter.get("user-logout", "/user/logout", authController.userLogout);

module.exports = router;
