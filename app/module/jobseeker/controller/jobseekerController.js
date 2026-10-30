const express = require("express");
const router = express.Router();
const routerLabel = require("route-label");
const { UserModel } = require("../../auth/model/user");
const namedRouter = routerLabel(router);

class JobSeekerController {
  // JobSeeker List page
  async JobSeekerListPage(req, res) {
    try {
      const jobSeeker = await UserModel.find({ role: "jobSeeker" });
      res.render("jobseeker/list", {
        data: jobSeeker,
      });
    } catch (err) {
      console.log(err);
    }
  }
}

module.exports = new JobSeekerController();
