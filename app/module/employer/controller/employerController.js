const express = require("express");
const router = express.Router();
const routerLabel = require("route-label");
const { UserModel, UserValidationSchema } = require("../../auth/model/user");
const { generateRandomPassword, hashPassword } = require("../../../helper/commonHelper");
const namedRouter = routerLabel(router);
const sendMailRegistration = require("../../../helper/sendEmail");

class EmployerController {
  // Employer List page
  async employerListPage(req, res) {
    try {
      const employers = await UserModel.find({ role: "employer" });
      res.render("employer/list", {
        data: employers,
        toast: req.query.toast || "",
      });
    } catch (err) {
      console.log(err);
    }
  }

  // Add Employer Page
  async employeeADDPage(req, res) {
    try {
      return res.render("employer/add", { toast: req.query.toast || "" });
    } catch (err) {
      console.log(err);
    }
  }

  // Employer Add (Admin Created User - auto-validated)
  async employerAdd(req, res) {
    try {
      const name = String(req.body.name || "").trim();
      const email = String(req.body.email || "").trim().toLowerCase();
      const role = req.body.role;
      if (
        name.length < 3 ||
        name.length > 50 ||
        !/^\S+@\S+\.\S+$/.test(email) ||
        !["employer", "jobSeeker"].includes(role)
      ) {
        return res.redirect(namedRouter.urlFor("employer-add") + "?toast=invalid");
      }
      const existingUser = await UserModel.findOne({ email });
      if (existingUser) {
        return res.redirect(namedRouter.urlFor("employer-add") + "?toast=duplicate");
      }
      const password = generateRandomPassword();
      const hashedPassword = await hashPassword(password);

      // Prepare user data - admin created users are auto-verified
      const data = {
        name: name,
        email: email,
        password: hashedPassword,
        image: req?.file ? req.file.path : "",
        role: role,
        frontendUser: false,
        isEmailVerified: true,
      };

      // User Schema validation
      const { error, value } = UserValidationSchema.validate(data);
      if (error) {
        console.log("Validation error on employerAdd:", error);
        return res.redirect(namedRouter.urlFor("employer-add") + "?toast=invalid");
      } else {
        const user = await UserModel.create(value);
        try {
          await sendMailRegistration(user, password);
        } catch (mailError) {
          await UserModel.deleteOne({ _id: user._id });
          console.error("Could not send account credentials:", mailError.message);
          return res.redirect(namedRouter.urlFor("employer-add") + "?toast=mail-failed");
        }
        return res.redirect(namedRouter.urlFor("employer-list") + "?toast=user-created");
      }
    } catch (err) {
      console.error("Could not create user:", err.message);
      return res.redirect(namedRouter.urlFor("employer-add") + "?toast=failed");
    }
  }
}

module.exports = new EmployerController();
