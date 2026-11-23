const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Joi = require("joi");

const UserValidationSchema = Joi.object({
  name: Joi.string().min(3).max(50).required(),
  email: Joi.string().email({ minDomainSegments: 2 }).required(),
  role: Joi.string().valid("admin", "employer", "jobSeeker").required(),
  password: Joi.string().min(6).required(),
  image: Joi.string().allow("").default(""),
  phone: Joi.string().allow("").default(""),
  headline: Joi.string().allow("").default(""),
  location: Joi.string().allow("").default(""),
  bio: Joi.string().allow("").default(""),
  skills: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()).default([]),
  frontendUser: Joi.boolean().default(false),
  isEmailVerified: Joi.boolean().default(false),
  otp: Joi.string().allow(null, "").default(null),
  otpExpiresAt: Joi.date().allow(null).default(null),
});

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      default: "",
    },
    role: {
      type: String,
      enum: ["admin", "employer", "jobSeeker"],
      default: "jobSeeker",
    },
    phone: {
      type: String,
      default: "",
      trim: true,
    },
    headline: {
      type: String,
      default: "",
      trim: true,
    },
    location: {
      type: String,
      default: "",
      trim: true,
    },
    bio: {
      type: String,
      default: "",
      trim: true,
    },
    skills: {
      type: [String],
      default: [],
    },
    frontendUser: {
      type: Boolean,
      default: false,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    otp: {
      type: String,
      default: null,
    },
    otpExpiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const UserModel = mongoose.model("user", userSchema);
module.exports = { UserModel, UserValidationSchema };
