const jwt = require("jsonwebtoken");
const SECRET_KEY =
  process.env.JWT_ACCESS_TOKEN_SECRET_KEY || "jobseeker_jwt_secret_key_2026";
const { JobModel } = require("../../module/job/model/job");
const { ApplicationModel } = require("../../module/job/model/application");
const { UserModel } = require("../../module/auth/model/user");
const { getUploadedFileName, getUploadedFilePath } = require("../../helper/commonHelper");

class JobApiController {
  /**
   * List Jobs API (with search, category, location, salary filters and pagination)
   */
  async listJobs(req, res) {
    try {
      const {
        search,
        location,
        jobType,
        workplaceType,
        category,
        minSalary,
        status,
        experienceLevel,
        page = 1,
        limit = 20,
      } = req.query;

      const filter = {};

      // Status filter (default active for public API)
      if (status) {
        filter.status = status;
      } else {
        filter.status = "active";
      }

      if (category && category !== "All") {
        filter.category = { $regex: category, $options: "i" };
      }

      if (location && location !== "All") {
        filter.location = { $regex: location, $options: "i" };
      }

      if (jobType && jobType !== "All") {
        filter.jobType = jobType;
      }

      if (workplaceType && workplaceType !== "All") {
        filter.workplaceType = workplaceType;
      }

      if (experienceLevel) {
        filter.experienceLevel = experienceLevel;
      }

      if (minSalary && Number(minSalary) > 0) {
        filter.minSalary = { $gte: Number(minSalary) };
      }

      if (search && String(search).trim()) {
        const query = String(search).trim();
        filter.$or = [
          { title: { $regex: query, $options: "i" } },
          { company: { $regex: query, $options: "i" } },
          { location: { $regex: query, $options: "i" } },
          { skills: { $in: [new RegExp(query, "i")] } },
          { description: { $regex: query, $options: "i" } },
        ];
      }

      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
      const skip = (pageNum - 1) * limitNum;

      const total = await JobModel.countDocuments(filter);
      const jobs = await JobModel.find(filter)
        .sort({ isFeatured: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum);

      return res.status(200).json({
        status: true,
        message: "Jobs retrieved successfully.",
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
        data: jobs,
      });
    } catch (err) {
      console.error("listJobs error:", err);
      return res.status(500).json({
        status: false,
        message: "Failed to retrieve jobs.",
        error: err.message,
      });
    }
  }

  /**
   * Get Single Job by ID (increments view count)
   */
  async getJobById(req, res) {
    try {
      const { id } = req.params;
      const job = await JobModel.findByIdAndUpdate(
        id,
        { $inc: { viewCount: 1 } },
        { new: true }
      );

      if (!job) {
        return res.status(404).json({
          status: false,
          message: "Job not found.",
        });
      }

      return res.status(200).json({
        status: true,
        message: "Job details retrieved successfully.",
        data: job,
      });
    } catch (err) {
      console.error("getJobById error:", err);
      return res.status(500).json({
        status: false,
        message: "Failed to retrieve job details.",
        error: err.message,
      });
    }
  }

  /**
   * Create Job API
   */
  async createJob(req, res) {
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
        hiringManager,
      } = req.body;

      if (!title || !company || !description) {
        return res.status(400).json({
          status: false,
          message: "Title, company, and description are required fields.",
        });
      }

      const computedSalaryText =
        salaryText ||
        (minSalary && maxSalary
          ? `$${Number(minSalary).toLocaleString()} - $${Number(maxSalary).toLocaleString()}`
          : minSalary
          ? `$${Number(minSalary).toLocaleString()}+`
          : "Competitive");

      const newJob = await JobModel.create({
        title: String(title).trim(),
        company: String(company).trim(),
        companyLogo: req?.file
          ? getUploadedFileName(req.file)
          : (req.body.companyLogo ? getUploadedFileName(req.body.companyLogo) : ""),
        location: String(location || "San Francisco, CA or Remote").trim(),
        jobType: jobType || "Full-time",
        workplaceType: workplaceType || "Remote",
        category: String(category || "Product & Engineering").trim(),
        minSalary: Number(minSalary) || 0,
        maxSalary: Number(maxSalary) || 0,
        salaryText: computedSalaryText,
        experienceLevel: experienceLevel || "Senior",
        description: String(description).trim(),
        requirements: Array.isArray(requirements) ? requirements : (requirements ? [requirements] : []),
        skills: Array.isArray(skills) ? skills : (skills ? String(skills).split(",").map(s => s.trim()) : []),
        status: status || "active",
        isFeatured: isFeatured === true || isFeatured === "true",
        hiringManager: hiringManager || {},
      });

      return res.status(201).json({
        status: true,
        message: "Job created successfully.",
        data: newJob,
      });
    } catch (err) {
      console.error("createJob error:", err);
      return res.status(500).json({
        status: false,
        message: "Failed to create job.",
        error: err.message,
      });
    }
  }

  /**
   * Update Job API
   */
  async updateJob(req, res) {
    try {
      const { id } = req.params;
      const updateData = { ...req.body };

      if (req.file) {
        updateData.companyLogo = getUploadedFileName(req.file);
      } else if (req.body.companyLogo) {
        updateData.companyLogo = getUploadedFileName(req.body.companyLogo);
      }

      const updatedJob = await JobModel.findByIdAndUpdate(id, updateData, { new: true });
      if (!updatedJob) {
        return res.status(404).json({
          status: false,
          message: "Job not found.",
        });
      }

      return res.status(200).json({
        status: true,
        message: "Job updated successfully.",
        data: updatedJob,
      });
    } catch (err) {
      console.error("updateJob error:", err);
      return res.status(500).json({
        status: false,
        message: "Failed to update job.",
        error: err.message,
      });
    }
  }

  /**
   * Delete Job API
   */
  async deleteJob(req, res) {
    try {
      const { id } = req.params;
      const job = await JobModel.findByIdAndDelete(id);
      if (!job) {
        return res.status(404).json({
          status: false,
          message: "Job not found.",
        });
      }

      return res.status(200).json({
        status: true,
        message: "Job deleted successfully.",
      });
    } catch (err) {
      console.error("deleteJob error:", err);
      return res.status(500).json({
        status: false,
        message: "Failed to delete job.",
        error: err.message,
      });
    }
  }

  /**
   * Apply for Job API
   * Blocks employer accounts from applying
   */
  async applyJob(req, res) {
    try {
      const authHeader = req.headers.authorization;
      let authenticatedUser = null;

      if (authHeader) {
        try {
          const token = authHeader.replace(/^Bearer\s+/, "");
          const decoded = jwt.verify(token, SECRET_KEY);
          authenticatedUser = await UserModel.findById(decoded._id);
        } catch (jwtErr) {
          // Token invalid or expired
        }
      }

      const jobId = req.body.jobId || req.body.job;
      const userId = authenticatedUser ? authenticatedUser._id : (req.body.userId || req.body.user);
      const note = req.body.note || "";

      if (!jobId) {
        return res.status(400).json({
          status: false,
          message: "Job ID is required to apply.",
        });
      }

      // Find user if not already fetched
      let applicantUser = authenticatedUser;
      if (!applicantUser && userId) {
        try {
          applicantUser = await UserModel.findById(userId);
        } catch (e) {}
      }

      // Check role: Employers CANNOT apply to jobs!
      const userRole = applicantUser ? applicantUser.role : req.body.role;
      if (userRole === "employer") {
        return res.status(403).json({
          status: false,
          message: "Employer accounts cannot apply to jobs. Only candidates/job seekers can submit applications.",
        });
      }

      // Validate Job exists
      const job = await JobModel.findById(jobId);
      if (!job) {
        return res.status(404).json({
          status: false,
          message: "Job position not found or has expired.",
        });
      }

      const applicantName = applicantUser ? applicantUser.name : (req.body.applicantName || req.body.name || "Candidate");
      const applicantEmail = applicantUser ? applicantUser.email : (req.body.applicantEmail || req.body.email || "");

      if (!applicantEmail) {
        return res.status(400).json({
          status: false,
          message: "Applicant email is required.",
        });
      }

      // Check if candidate already applied for this job
      const queryCheck = { job: job._id };
      if (applicantUser) {
        queryCheck.user = applicantUser._id;
      } else {
        queryCheck.applicantEmail = applicantEmail.toLowerCase();
      }

      const existingApplication = await ApplicationModel.findOne(queryCheck);
      if (existingApplication) {
        return res.status(200).json({
          status: true,
          message: "You have already applied for this position. Your application is currently under review.",
          applicationId: existingApplication._id,
          data: existingApplication,
        });
      }

      // Create new application
      const newApplication = await ApplicationModel.create({
        job: job._id,
        user: applicantUser ? applicantUser._id : null,
        applicantName,
        applicantEmail: applicantEmail.toLowerCase(),
        jobTitle: job.title,
        company: job.company,
        companyLogo: job.companyLogo || "",
        location: job.location,
        salaryRange: job.salaryText || (job.minSalary && job.maxSalary ? `$${job.minSalary} - $${job.maxSalary}` : "Competitive"),
        jobType: job.jobType,
        note: String(note).trim(),
        status: "Submitted",
        appliedAt: new Date(),
      });

      // Increment job applicantCount
      await JobModel.findByIdAndUpdate(job._id, { $inc: { applicantCount: 1 } });

      return res.status(201).json({
        status: true,
        message: "Application submitted successfully! Track its status in your profile.",
        applicationId: newApplication._id,
        data: newApplication,
      });
    } catch (err) {
      console.error("applyJob error:", err);
      return res.status(500).json({
        status: false,
        message: "Failed to submit job application.",
        error: err.message,
      });
    }
  }

  /**
   * Get User Applied Jobs API
   * Retrieves applications for candidate to display on My Profile
   */
  async getUserApplications(req, res) {
    try {
      const authHeader = req.headers.authorization;
      let userId = req.query.userId || req.query.user;
      let userEmail = req.query.email;

      if (authHeader) {
        try {
          const token = authHeader.replace(/^Bearer\s+/, "");
          const decoded = jwt.verify(token, SECRET_KEY);
          userId = decoded._id;
          if (decoded.email) userEmail = decoded.email;
        } catch (jwtErr) {
          // Token invalid
        }
      }

      const filter = {};
      if (userId) {
        filter.$or = [{ user: userId }];
        if (userEmail) filter.$or.push({ applicantEmail: String(userEmail).toLowerCase() });
      } else if (userEmail) {
        filter.applicantEmail = String(userEmail).toLowerCase();
      } else {
        return res.status(400).json({
          status: false,
          message: "Authentication token or user ID/email required to fetch applied jobs.",
          data: [],
        });
      }

      const applications = await ApplicationModel.find(filter)
        .populate("job")
        .sort({ createdAt: -1 });

      return res.status(200).json({
        status: true,
        message: "Applied jobs retrieved successfully.",
        count: applications.length,
        data: applications,
      });
    } catch (err) {
      console.error("getUserApplications error:", err);
      return res.status(500).json({
        status: false,
        message: "Failed to retrieve applied jobs.",
        error: err.message,
        data: [],
      });
    }
  }
}

module.exports = new JobApiController();

