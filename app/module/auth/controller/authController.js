const express = require("express");
const router = express.Router();
const routerLabel = require("route-label");
const namedRouter = routerLabel(router);
const jwt = require("jsonwebtoken");
const { UserModel } = require("../model/user");
const { comparePassword, hashPassword } = require("../../../helper/commonHelper");
const SECRET_KEY = process.env.JWT_ACCESS_TOKEN_SECRET_KEY;

class AuthController {
  // Login Page
  async loginPage(req, res) {
    try {
      res.render("auth/signin", { toast: req.query.toast || "" });
    } catch (err) {
      console.error("Could not render sign-in page:", err.message);
      return res.status(500).send("Could not load the sign-in page.");
    }
  }
  async registerPage(req, res) {
    return res.render("auth/register", { toast: req.query.toast || "" });
  }

  async userLoginPage(req, res) {
    return res.render("auth/user-signin", { toast: req.query.toast || "" });
  }

  async userLogin(req, res) {
    try {
      const email = String(req.body.email || "").trim().toLowerCase();
      const password = String(req.body.password || "");
      const user = email && await UserModel.findOne({ email });
      if (!user || !["employer", "jobSeeker"].includes(user.role) || !(await comparePassword(password, user.password))) {
        return res.redirect("/login?toast=login-failed");
      }
      const token = jwt.sign({ _id: user._id, name: user.name, email: user.email, role: user.role }, SECRET_KEY, { expiresIn: "1h" });
      res.cookie("userToken", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 3600000,
      });
      return res.redirect("/account");
    } catch (err) {
      console.error("User login failed:", err.message);
      return res.redirect("/login?toast=login-failed");
    }
  }

  async userHome(req, res) {
    return res.render("auth/user-home", { user: req.authUser });
  }

  userLogout(req, res) {
    res.clearCookie("userToken");
    return res.redirect("/login?toast=logout");
  }

  async adminRegister(req, res) {
    try {
      const name = String(req.body.name || "").trim();
      const email = String(req.body.email || "").trim().toLowerCase();
      const password = String(req.body.password || "");
      if (name.length < 3 || name.length > 30 || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8) {
        return res.redirect(namedRouter.urlFor("admin-register-page") + "?toast=invalid");
      }
      if (await UserModel.findOne({ email })) {
        return res.redirect(namedRouter.urlFor("admin-register-page") + "?toast=duplicate");
      }
      await UserModel.create({ name, email, password: await hashPassword(password), role: "admin", image: "" });
      return res.redirect(namedRouter.urlFor("admin-login-page") + "?toast=registered");
    } catch (err) {
      console.error("Admin registration failed:", err.message);
      return res.redirect(namedRouter.urlFor("admin-register-page") + "?toast=failed");
    }
  }

  // Login Admin
  async adminLogin(req, res) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.redirect(namedRouter.urlFor("admin-login-page") + "?toast=login-failed");
      }
      const user = await UserModel.findOne({ email: String(email).trim().toLowerCase() });
      if (!user) {
        return res.redirect(namedRouter.urlFor("admin-login-page") + "?toast=login-failed");
      }
      const isPasswordMatch = await comparePassword(password, user.password);
      if (!isPasswordMatch) {
        return res.redirect(namedRouter.urlFor("admin-login-page") + "?toast=login-failed");
      }
      if (user.role !== "admin") {
        return res.redirect(namedRouter.urlFor("admin-login-page") + "?toast=login-failed");
      }
      const token = jwt.sign(
        {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          image: user.image,
        },
        SECRET_KEY,
        { expiresIn: "1h" }
      );
      // Set token in cookies
      res.cookie("adminToken", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 3600000,
      });
      return res.redirect(namedRouter.urlFor("employer-list") + "?toast=login-success");
    } catch (err) {
      console.error("Login failed:", err.message);
      return res.redirect(namedRouter.urlFor("admin-login-page") + "?toast=login-failed");
    }
  }

  // Logout
  async logout(req, res) {
    res.clearCookie("adminToken");
    res.redirect(namedRouter.urlFor("admin-login-page") + "?toast=logout");
  }
}

module.exports = new AuthController();
