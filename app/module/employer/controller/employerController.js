const express = require("express");
const router = express.Router();
const routerLabel = require("route-label");
const { UserModel, UserValidationSchema } = require("../../auth/model/user");
const {
  generateRandomPassword,
  hashPassword,
  getUploadedFileName,
  getUploadedFilePath,
  getImageUrl,
} = require("../../../helper/commonHelper");
const namedRouter = routerLabel(router);
const { sendMailRegistration } = require("../../../helper/sendEmail");

class EmployerController {
  // Employer List page
  async employerListPage(req, res) {
    try {
      const employers = await UserModel.find({ role: "employer" }).sort({ createdAt: -1 });
      res.render("employer/list", {
        data: employers,
        toast: req.query.toast || "",
        getImageUrl,
      });
    } catch (err) {
      console.error("employerListPage error:", err);
      res.render("employer/list", { data: [], toast: "failed", getImageUrl });
    }
  }

  // Add Employer Page
  async employeeADDPage(req, res) {
    try {
      return res.render("employer/add", { toast: req.query.toast || "" });
    } catch (err) {
      console.error("employeeADDPage error:", err);
      return res.redirect(namedRouter.urlFor("employer-list") + "?toast=failed");
    }
  }

  // Employer Add (Admin Created User - auto-validated)
  async employerAdd(req, res) {
    try {
      const name = String(req.body.name || "").trim();
      const email = String(req.body.email || "").trim().toLowerCase();
      const role = req.body.role || "employer";
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

      const data = {
        name: name,
        email: email,
        password: hashedPassword,
        image: getUploadedFileName(req.file),
        role: role,
        frontendUser: false,
        isEmailVerified: true,
      };

      const { error, value } = UserValidationSchema.validate(data);
      if (error) {
        console.error("Validation error on employerAdd:", error);
        return res.redirect(namedRouter.urlFor("employer-add") + "?toast=invalid");
      } else {
        const user = await UserModel.create(value);
        try {
          if (sendMailRegistration) {
            await sendMailRegistration(user, password);
          }
        } catch (mailError) {
          console.warn("Could not send credentials email, but user created:", mailError.message);
        }

        // Redirect to jobSeeker-list if created role was jobSeeker, otherwise employer-list
        const targetRoute = role === "jobSeeker" ? "jobSeeker-list" : "employer-list";
        return res.redirect(namedRouter.urlFor(targetRoute) + "?toast=user-created");
      }
    } catch (err) {
      console.error("Could not create user:", err.message);
      return res.redirect(namedRouter.urlFor("employer-add") + "?toast=failed");
    }
  }

  // Edit Employer Page
  async employerEditPage(req, res) {
    try {
      const employer = await UserModel.findById(req.params.id);
      if (!employer) {
        return res.redirect(namedRouter.urlFor("employer-list") + "?toast=invalid");
      }
      return res.render("employer/edit", {
        data: employer,
        toast: req.query.toast || "",
        getImageUrl,
      });
    } catch (err) {
      console.error("employerEditPage error:", err.message);
      return res.redirect(namedRouter.urlFor("employer-list") + "?toast=failed");
    }
  }

  // Update Employer
  async employerUpdate(req, res) {
    try {
      const { id } = req.params;
      const { name, email, role, isEmailVerified } = req.body;

      const updateData = {};
      if (name) updateData.name = String(name).trim();
      if (email) updateData.email = String(email).trim().toLowerCase();
      if (role && ["employer", "jobSeeker"].includes(role)) updateData.role = role;
      updateData.isEmailVerified = isEmailVerified === "true" || isEmailVerified === true;

      if (req.file) {
        updateData.image = getUploadedFileName(req.file);
      }

      await UserModel.findByIdAndUpdate(id, updateData, { new: true });
      const targetRoute = role === "jobSeeker" ? "jobSeeker-list" : "employer-list";
      return res.redirect(namedRouter.urlFor(targetRoute) + "?toast=user-updated");
    } catch (err) {
      console.error("employerUpdate error:", err.message);
      return res.redirect(namedRouter.urlFor("employer-list") + "?toast=update-failed");
    }
  }

  // Delete Employer
  async employerDelete(req, res) {
    try {
      const { id } = req.params;
      await UserModel.findByIdAndDelete(id);
      return res.redirect(namedRouter.urlFor("employer-list") + "?toast=user-deleted");
    } catch (err) {
      console.error("employerDelete error:", err.message);
      return res.redirect(namedRouter.urlFor("employer-list") + "?toast=delete-failed");
    }
  }
}

module.exports = new EmployerController();
