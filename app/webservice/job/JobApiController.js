const { JobModel } = require("../../module/job/model/job");
const { getUploadedFilePath } = require("../../helper/commonHelper");

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
        companyLogo: req?.file ? getUploadedFilePath(req.file) : (req.body.companyLogo || ""),
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
        updateData.companyLogo = getUploadedFilePath(req.file);
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
}

module.exports = new JobApiController();

