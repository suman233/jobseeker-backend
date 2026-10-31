const express = require("express");
const router = express.Router();
const routerLabel = require("route-label");
const JobApiController = require("../../../webservice/job/JobApiController");
const ImageUpload = require("../../../helper/imageUpload");
const namedRouter = routerLabel(router);

// Public / Candidate / Employer Job Endpoints
namedRouter.get("api-jobs-list", "/jobs", JobApiController.listJobs);
namedRouter.get("api-jobs-list-alt", "/job-list", JobApiController.listJobs);

namedRouter.get("api-job-detail", "/jobs/:id", JobApiController.getJobById);
namedRouter.get("api-job-detail-alt", "/job-details/:id", JobApiController.getJobById);

namedRouter.post(
  "api-job-create",
  "/jobs",
  ImageUpload.single("companyLogo"),
  JobApiController.createJob
);
namedRouter.post(
  "api-job-create-alt",
  "/job-create",
  ImageUpload.single("companyLogo"),
  JobApiController.createJob
);

namedRouter.put(
  "api-job-update",
  "/jobs/:id",
  ImageUpload.single("companyLogo"),
  JobApiController.updateJob
);
namedRouter.post(
  "api-job-update-post",
  "/job-update/:id",
  ImageUpload.single("companyLogo"),
  JobApiController.updateJob
);

namedRouter.delete("api-job-delete", "/jobs/:id", JobApiController.deleteJob);
namedRouter.delete("api-job-delete-alt", "/job-delete/:id", JobApiController.deleteJob);
namedRouter.get("api-job-delete-get", "/job-delete/:id", JobApiController.deleteJob);

module.exports = router;

