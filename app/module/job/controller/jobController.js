const express = require("express");
const router = express.Router();
const routerLabel = require("route-label");
const { JobModel } = require("../model/job");
const { ApplicationModel } = require("../model/application");
const {
  getUploadedFileName,
  getUploadedFilePath,
  getImageUrl,
} = require("../../../helper/commonHelper");
const namedRouter = routerLabel(router);

class JobController {
  // Job List Page
  async jobListPage(req, res) {
    try {
      const jobs = await JobModel.find().sort({ createdAt: -1 }).lean();
      
      // Calculate real-time applicant counts per job
      try {
        const appCounts = await ApplicationModel.aggregate([
          { $group: { _id: "$job", count: { $sum: 1 } } },
        ]);
        const countMap = {};
        appCounts.forEach((c) => {
          if (c._id) countMap[String(c._id)] = c.count;
        });
        jobs.forEach((job) => {
          job.applicantCount = countMap[String(job._id)] || job.applicantCount || 0;
        });
      } catch (countErr) {
        console.warn("Could not aggregate applicant counts:", countErr.message);
      }

      res.render("job/list", {
        data: jobs,
        toast: req.query.toast || "",
        getImageUrl,
      });
    } catch (err) {
      console.error("jobListPage error:", err);
      res.render("job/list", { data: [], toast: "failed", getImageUrl });
    }
  }

  // Job Applicants Page (Track who applied for this job)
  async jobApplicantsPage(req, res) {
    try {
      const { id } = req.params;
      const job = await JobModel.findById(id);
      if (!job) {
        return res.redirect(namedRouter.urlFor("job-list") + "?toast=not-found");
      }

      const applicants = await ApplicationModel.find({ job: id })
        .populate("user")
        .sort({ createdAt: -1 });

      return res.render("job/applicants", {
        job,
        data: applicants,
        toast: req.query.toast || "",
        getImageUrl,
      });
    } catch (err) {
      console.error("jobApplicantsPage error:", err);
      return res.redirect(namedRouter.urlFor("job-list") + "?toast=failed");
    }
  }

  // Update applicant status (e.g. Under Review, Interviewing, Offer, Rejected)
  async updateApplicationStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, jobId } = req.body;
      if (
        ["Submitted", "Under Review", "Interviewing", "Offer", "Rejected"].includes(
          status
        )
      ) {
        await ApplicationModel.findByIdAndUpdate(id, { status });
      }
      const targetJobId = jobId || req.query.jobId;
      if (targetJobId) {
        return res.redirect(
          namedRouter.urlFor("job-applicants", { id: targetJobId }) +
            "?toast=status-updated"
        );
      }
      return res.redirect(namedRouter.urlFor("job-list") + "?toast=status-updated");
    } catch (err) {
      console.error("updateApplicationStatus error:", err);
      return res.redirect(namedRouter.urlFor("job-list") + "?toast=failed");
    }
  }

  // Job Add Page
  async jobAddPage(req, res) {
    try {
      res.render("job/add", { toast: req.query.toast || "" });
    } catch (err) {
      console.error("jobAddPage error:", err);
      res.redirect(namedRouter.urlFor("job-list") + "?toast=failed");
    }
  }

  // Job Add Handler
  async jobAdd(req, res) {
    try {
      const {
        title,
        company,
        location,
        jobType,
        workplaceType,
        category,
        minSalary,
        maxSalary,
        salaryText,
        experienceLevel,
        description,
        requirements,
        skills,
        status,
        isFeatured,
        hiringManagerName,
        hiringManagerRole,
      } = req.body;

      if (!title || !company || !description) {
        return res.redirect(namedRouter.urlFor("job-add") + "?toast=invalid");
      }

      // Parse requirements & skills
      const parsedRequirements = Array.isArray(requirements)
        ? requirements
        : String(requirements || "")
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean);

      const parsedSkills = Array.isArray(skills)
        ? skills
        : String(skills || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);

      const computedSalaryText =
        salaryText ||
        (minSalary && maxSalary
          ? `$${Number(minSalary).toLocaleString()} - $${Number(maxSalary).toLocaleString()}`
          : minSalary
          ? `$${Number(minSalary).toLocaleString()}+`
          : "Competitive");

      const jobData = {
        title: String(title).trim(),
        company: String(company).trim(),
        companyLogo: getUploadedFileName(req.file),
        location: String(location || "San Francisco, CA or Remote").trim(),
        jobType: jobType || "Full-time",
        workplaceType: workplaceType || "Remote",
        category: String(category || "Product & Engineering").trim(),
        minSalary: Number(minSalary) || 0,
        maxSalary: Number(maxSalary) || 0,
        salaryText: computedSalaryText,
        experienceLevel: experienceLevel || "Senior",
        description: String(description).trim(),
        requirements: parsedRequirements,
        skills: parsedSkills,
        status: status || "active",
        isFeatured: isFeatured === "true" || isFeatured === true,
        hiringManager: {
          name: String(hiringManagerName || "").trim(),
          role: String(hiringManagerRole || "").trim(),
          avatar: "",
        },
      };

      await JobModel.create(jobData);
      return res.redirect(namedRouter.urlFor("job-list") + "?toast=job-created");
    } catch (err) {
      console.error("jobAdd error:", err);
      return res.redirect(namedRouter.urlFor("job-add") + "?toast=failed");
    }
  }

  // Job Edit Page
  async jobEditPage(req, res) {
    try {
      const job = await JobModel.findById(req.params.id);
      if (!job) {
        return res.redirect(namedRouter.urlFor("job-list") + "?toast=invalid");
      }
      return res.render("job/edit", {
        data: job,
        toast: req.query.toast || "",
        getImageUrl,
      });
    } catch (err) {
      console.error("jobEditPage error:", err);
      return res.redirect(namedRouter.urlFor("job-list") + "?toast=failed");
    }
  }

  // Job Update Handler
  async jobUpdate(req, res) {
    try {
      const { id } = req.params;
      const {
        title,
        company,
        location,
        jobType,
        workplaceType,
        category,
        minSalary,
        maxSalary,
        salaryText,
        experienceLevel,
        description,
        requirements,
        skills,
        status,
        isFeatured,
        hiringManagerName,
        hiringManagerRole,
      } = req.body;

      const parsedRequirements = Array.isArray(requirements)
        ? requirements
        : String(requirements || "")
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean);

      const parsedSkills = Array.isArray(skills)
        ? skills
        : String(skills || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);

      const computedSalaryText =
        salaryText ||
        (minSalary && maxSalary
          ? `$${Number(minSalary).toLocaleString()} - $${Number(maxSalary).toLocaleString()}`
          : minSalary
          ? `$${Number(minSalary).toLocaleString()}+`
          : "Competitive");

      const updateData = {
        title: String(title).trim(),
        company: String(company).trim(),
        location: String(location || "").trim(),
        jobType: jobType || "Full-time",
        workplaceType: workplaceType || "Remote",
        category: String(category || "Product & Engineering").trim(),
        minSalary: Number(minSalary) || 0,
        maxSalary: Number(maxSalary) || 0,
        salaryText: computedSalaryText,
        experienceLevel: experienceLevel || "Senior",
        description: String(description).trim(),
        requirements: parsedRequirements,
        skills: parsedSkills,
        status: status || "active",
        isFeatured: isFeatured === "true" || isFeatured === true,
        hiringManager: {
          name: String(hiringManagerName || "").trim(),
          role: String(hiringManagerRole || "").trim(),
        },
      };

      if (req.file) {
        updateData.companyLogo = getUploadedFileName(req.file);
      }

      await JobModel.findByIdAndUpdate(id, updateData, { new: true });
      return res.redirect(namedRouter.urlFor("job-list") + "?toast=job-updated");
    } catch (err) {
      console.error("jobUpdate error:", err);
      return res.redirect(namedRouter.urlFor("job-list") + "?toast=update-failed");
    }
  }

  // Job Delete Handler
  async jobDelete(req, res) {
    try {
      const { id } = req.params;
      await JobModel.findByIdAndDelete(id);
      return res.redirect(namedRouter.urlFor("job-list") + "?toast=job-deleted");
    } catch (err) {
      console.error("jobDelete error:", err);
      return res.redirect(namedRouter.urlFor("job-list") + "?toast=delete-failed");
    }
  }
}

module.exports = new JobController();

