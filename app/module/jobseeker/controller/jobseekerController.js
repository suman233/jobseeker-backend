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

class JobSeekerController {
  // JobSeeker List page
  async JobSeekerListPage(req, res) {
    try {
      const jobSeekers = await UserModel.find({ role: "jobSeeker" }).sort({ createdAt: -1 });
      res.render("jobseeker/list", {
        data: jobSeekers,
        toast: req.query.toast || "",
        getImageUrl,
      });
    } catch (err) {
      console.error("JobSeekerListPage error:", err);
      res.render("jobseeker/list", { data: [], toast: "failed", getImageUrl });
    }
  }

  // JobSeeker Add Page
  async jobSeekerAddPage(req, res) {
    try {
      res.render("jobseeker/add", { toast: req.query.toast || "" });
    } catch (err) {
      console.error("jobSeekerAddPage error:", err);
      res.redirect(namedRouter.urlFor("jobSeeker-list") + "?toast=failed");
    }
  }

  // JobSeeker Add (Admin Created - auto-validated and redirects to jobSeeker-list)
  async jobSeekerAdd(req, res) {
    try {
      const name = String(req.body.name || "").trim();
      const email = String(req.body.email || "").trim().toLowerCase();
      const role = "jobSeeker";

      if (name.length < 3 || name.length > 50 || !/^\S+@\S+\.\S+$/.test(email)) {
        return res.redirect(namedRouter.urlFor("jobSeeker-add") + "?toast=invalid");
      }

      const existingUser = await UserModel.findOne({ email });
      if (existingUser) {
        return res.redirect(namedRouter.urlFor("jobSeeker-add") + "?toast=duplicate");
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
        console.error("Validation error on jobSeekerAdd:", error);
        return res.redirect(namedRouter.urlFor("jobSeeker-add") + "?toast=invalid");
      }

      const user = await UserModel.create(value);
      try {
        if (sendMailRegistration) {
          await sendMailRegistration(user, password);
        }
      } catch (mailError) {
        console.warn("Could not send credentials email, but user created:", mailError.message);
      }

      // Explicitly redirect to jobSeeker-list!
      return res.redirect(namedRouter.urlFor("jobSeeker-list") + "?toast=user-created");
    } catch (err) {
      console.error("Could not create job seeker:", err.message);
      return res.redirect(namedRouter.urlFor("jobSeeker-add") + "?toast=failed");
    }
  }

  // Edit JobSeeker Page
  async jobSeekerEditPage(req, res) {
    try {
      const jobSeeker = await UserModel.findById(req.params.id);
      if (!jobSeeker) {
        return res.redirect(namedRouter.urlFor("jobSeeker-list") + "?toast=invalid");
      }
      return res.render("jobseeker/edit", {
        data: jobSeeker,
        toast: req.query.toast || "",
        getImageUrl,
      });
    } catch (err) {
      console.error("jobSeekerEditPage error:", err.message);
      return res.redirect(namedRouter.urlFor("jobSeeker-list") + "?toast=failed");
    }
  }

  // Update JobSeeker
  async jobSeekerUpdate(req, res) {
    try {
      const { id } = req.params;
      const { name, email, role, isEmailVerified } = req.body;

      const updateData = {};
      if (name) updateData.name = String(name).trim();
      if (email) updateData.email = String(email).trim().toLowerCase();
      if (role && ["jobSeeker", "employer"].includes(role)) updateData.role = role;
      updateData.isEmailVerified = isEmailVerified === "true" || isEmailVerified === true;

      if (req.file) {
        updateData.image = getUploadedFileName(req.file);
      }

      await UserModel.findByIdAndUpdate(id, updateData, { new: true });
      const targetRoute = role === "employer" ? "employer-list" : "jobSeeker-list";
      return res.redirect(namedRouter.urlFor(targetRoute) + "?toast=user-updated");
    } catch (err) {
      console.error("jobSeekerUpdate error:", err.message);
      return res.redirect(namedRouter.urlFor("jobSeeker-list") + "?toast=update-failed");
    }
  }

  // Delete JobSeeker
  async jobSeekerDelete(req, res) {
    try {
      const { id } = req.params;
      await UserModel.findByIdAndDelete(id);
      return res.redirect(namedRouter.urlFor("jobSeeker-list") + "?toast=user-deleted");
    } catch (err) {
      console.error("jobSeekerDelete error:", err.message);
      return res.redirect(namedRouter.urlFor("jobSeeker-list") + "?toast=delete-failed");
    }
  }
}

module.exports = new JobSeekerController();
