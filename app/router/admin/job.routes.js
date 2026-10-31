const express = require("express");
const router = express.Router();
const routerLabel = require("route-label");
const jobController = require("../../module/job/controller/jobController");
const ImageUpload = require("../../helper/imageUpload");
const requireAdmin = require("../../middleware/requireAdmin");
const namedRouter = routerLabel(router);

router.use(requireAdmin);

namedRouter.get("job-list", "/job", jobController.jobListPage);
namedRouter.get("job-add", "/job-add", jobController.jobAddPage);
namedRouter.post(
  "job-create",
  "/job-create",
  ImageUpload.single("companyLogo"),
  jobController.jobAdd
);
namedRouter.get("job-edit", "/job-edit/:id", jobController.jobEditPage);
namedRouter.post(
  "job-update",
  "/job-update/:id",
  ImageUpload.single("companyLogo"),
  jobController.jobUpdate
);
namedRouter.get("job-delete", "/job-delete/:id", jobController.jobDelete);

module.exports = router;
