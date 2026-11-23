const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const applicationSchema = new Schema(
  {
    job: {
      type: Schema.Types.ObjectId,
      ref: "job",
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    applicantName: {
      type: String,
      required: true,
      trim: true,
    },
    applicantEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    jobTitle: {
      type: String,
      default: "",
      trim: true,
    },
    company: {
      type: String,
      default: "",
      trim: true,
    },
    companyLogo: {
      type: String,
      default: "",
    },
    location: {
      type: String,
      default: "",
      trim: true,
    },
    salaryRange: {
      type: String,
      default: "",
      trim: true,
    },
    jobType: {
      type: String,
      default: "Full-time",
    },
    note: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: ["Submitted", "Under Review", "Interviewing", "Offer", "Rejected"],
      default: "Submitted",
    },
    appliedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Add index on user and job for fast lookups
applicationSchema.index({ user: 1, createdAt: -1 });
applicationSchema.index({ job: 1, user: 1 });

const ApplicationModel = mongoose.model("application", applicationSchema);
module.exports = { ApplicationModel };

