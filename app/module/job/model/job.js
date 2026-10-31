const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const jobSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    company: {
      type: String,
      required: true,
      trim: true,
    },
    companyLogo: {
      type: String,
      default: "",
    },
    location: {
      type: String,
      required: true,
      trim: true,
      default: "San Francisco, CA or Remote",
    },
    jobType: {
      type: String,
      enum: ["Full-time", "Part-time", "Contract", "Internship", "Remote"],
      default: "Full-time",
    },
    workplaceType: {
      type: String,
      enum: ["Remote", "On-site", "Hybrid"],
      default: "Remote",
    },
    category: {
      type: String,
      default: "Product & Engineering",
      trim: true,
    },
    minSalary: {
      type: Number,
      default: 0,
    },
    maxSalary: {
      type: Number,
      default: 0,
    },
    salaryText: {
      type: String,
      default: "",
      trim: true,
    },
    experienceLevel: {
      type: String,
      enum: ["Entry", "Mid-level", "Senior", "Lead", "Director"],
      default: "Senior",
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    requirements: {
      type: [String],
      default: [],
    },
    skills: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ["active", "closed", "draft"],
      default: "active",
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    hiringManager: {
      name: { type: String, default: "" },
      role: { type: String, default: "" },
      avatar: { type: String, default: "" },
    },
    postedBy: {
      type: Schema.Types.ObjectId,
      ref: "user",
      default: null,
    },
    applicantCount: {
      type: Number,
      default: 0,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const JobModel = mongoose.model("job", jobSchema);

module.exports = { JobModel };
