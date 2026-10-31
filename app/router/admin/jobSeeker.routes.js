const express = require("express");
const router = express.Router();
const routerLabel = require("route-label");
const jobseekerController = require("../../module/jobseeker/controller/jobseekerController");
const ImageUpload = require("../../helper/imageUpload");
const requireAdmin = require("../../middleware/requireAdmin");
const namedRouter = routerLabel(router);

router.use(requireAdmin);

namedRouter.get("jobSeeker-list", "/job-seeker", jobseekerController.JobSeekerListPage);
namedRouter.get("jobSeeker-add", "/job-seeker-add", jobseekerController.jobSeekerAddPage);
namedRouter.post(
  "jobSeeker-register",
  "/job-seeker-registration",
  ImageUpload.single("image"),
  jobseekerController.jobSeekerAdd
);
namedRouter.get("jobSeeker-edit", "/job-seeker-edit/:id", jobseekerController.jobSeekerEditPage);
namedRouter.post(
  "jobSeeker-update",
  "/job-seeker-update/:id",
  ImageUpload.single("image"),
  jobseekerController.jobSeekerUpdate
);
namedRouter.get("jobSeeker-delete", "/job-seeker-delete/:id", jobseekerController.jobSeekerDelete);

module.exports = router;
