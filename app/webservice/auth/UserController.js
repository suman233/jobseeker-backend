const jwt = require("jsonwebtoken");
const SECRET_KEY =
  process.env.JWT_ACCESS_TOKEN_SECRET_KEY || "jobseeker_jwt_secret_key_2026";
const {
  comparePassword,
  hashPassword,
  generateRandomPassword,
  getUploadedFileName,
  getUploadedFilePath,
} = require("../../helper/commonHelper");
const { UserModel } = require("../../module/auth/model/user");
const { OtpModel } = require("../../module/auth/model/otp");
const { sendOtpEmail } = require("../../helper/sendEmail");

class UserController {
  /**
   * Send Email OTP for Pre-registration Verification
   */
  async sendEmailOtp(req, res) {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({
          status: false,
          message: "Email is required.",
        });
      }

      const normalizedEmail = String(email).trim().toLowerCase();
      const emailRegex = /^\S+@\S+\.\S+$/;
      if (!emailRegex.test(normalizedEmail)) {
        return res.status(400).json({
          status: false,
          message: "Please enter a valid email address.",
        });
      }

      const existingUser = await UserModel.findOne({ email: normalizedEmail });
      if (existingUser && existingUser.isEmailVerified) {
        return res.status(400).json({
          status: false,
          message: "An account with this email already exists and is verified. Please log in.",
        });
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      await OtpModel.findOneAndUpdate(
        { email: normalizedEmail },
        { otp, isVerified: false, createdAt: new Date() },
        { upsert: true, new: true }
      );

      await sendOtpEmail(normalizedEmail, "Candidate", otp);

      return res.status(200).json({
        status: true,
        message: "A 6-digit verification code has been sent to your email.",
        email: normalizedEmail,
        devCode: process.env.NODE_ENV !== "production" ? otp : undefined,
      });
    } catch (err) {
      console.error("Error in sendEmailOtp:", err);
      return res.status(500).json({
        status: false,
        message: "Failed to send verification code.",
        error: err.message,
      });
    }
  }

  /**
   * Verify Pre-registration Email OTP
   */
  async verifyEmailOtp(req, res) {
    try {
      const { email, otp } = req.body;
      if (!email || !otp) {
        return res.status(400).json({
          status: false,
          message: "Email and 6-digit OTP code are required.",
        });
      }

      const normalizedEmail = String(email).trim().toLowerCase();
      const inputOtp = String(otp).trim();

      const otpDoc = await OtpModel.findOne({ email: normalizedEmail });
      if (!otpDoc || otpDoc.otp !== inputOtp) {
        return res.status(400).json({
          status: false,
          message: "Invalid verification code. Please check and try again.",
        });
      }

      otpDoc.isVerified = true;
      await otpDoc.save();

      return res.status(200).json({
        status: true,
        isVerified: true,
        message: "Email verified successfully! You can now complete your registration.",
        email: normalizedEmail,
      });
    } catch (err) {
      console.error("Error in verifyEmailOtp:", err);
      return res.status(500).json({
        status: false,
        message: "Failed to verify code.",
        error: err.message,
      });
    }
  }

  /**
   * User Registration / Sign Up
   * Supports pre-verified email (sets isEmailVerified: true immediately),
   * or falls back to post-registration OTP email.
   */
  async registerUser(req, res) {
    try {
      const { name, email, password, role, image } = req.body;

      if (!email) {
        return res.status(400).json({
          status: false,
          message: "Email is required.",
        });
      }

      if (!password || String(password).length < 6) {
        return res.status(400).json({
          status: false,
          message: "Password is required and must be at least 6 characters.",
        });
      }

      const normalizedEmail = String(email).trim().toLowerCase();
      let existingUser = await UserModel.findOne({ email: normalizedEmail });

      const finalName =
        (name && String(name).trim()) || normalizedEmail.split("@")[0];
      const hashedPassword = await hashPassword(String(password));
      const finalImage = req.file
        ? getUploadedFileName(req.file)
        : (image ? getUploadedFileName(image) : "");

      // Check if email was verified beforehand via OTP verification
      const verifiedOtpDoc = await OtpModel.findOne({
        email: normalizedEmail,
        isVerified: true,
      });

      if (existingUser) {
        if (existingUser.isEmailVerified) {
          return res.status(400).json({
            status: false,
            message: "An account with this email already exists and is verified. Please log in.",
          });
        }

        // Existing unverified user completing registration
        existingUser.name = finalName;
        existingUser.password = hashedPassword;
        existingUser.frontendUser = true;
        if (role) existingUser.role = role;
        if (finalImage) existingUser.image = finalImage;

        if (verifiedOtpDoc) {
          existingUser.isEmailVerified = true;
          existingUser.otp = null;
          existingUser.otpExpiresAt = null;
          await existingUser.save();
          await OtpModel.deleteMany({ email: normalizedEmail });

          console.log(`[AUTH] Pre-verified candidate updated: ${normalizedEmail}`);

          return res.status(200).json({
            status: true,
            isEmailVerified: true,
            message: "Account created successfully! Please sign in with your email and password.",
            user: {
              _id: existingUser._id,
              name: existingUser.name,
              email: existingUser.email,
              role: existingUser.role,
              isEmailVerified: true,
            },
          });
        }

        // Fallback: send fresh OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
        existingUser.otp = otp;
        existingUser.otpExpiresAt = otpExpiresAt;
        await existingUser.save();

        await sendOtpEmail(normalizedEmail, finalName, otp);

        return res.status(200).json({
          status: true,
          requireOtp: true,
          email: normalizedEmail,
          message: "Account pending verification. A fresh 6-digit verification code has been sent to your email.",
        });
      }

      // If email was pre-verified
      if (verifiedOtpDoc) {
        const newUser = await UserModel.create({
          name: finalName,
          email: normalizedEmail,
          password: hashedPassword,
          role: role || "jobSeeker",
          image: finalImage || "",
          frontendUser: true,
          isEmailVerified: true,
          otp: null,
          otpExpiresAt: null,
        });

        await OtpModel.deleteMany({ email: normalizedEmail });

        console.log(`[AUTH] New pre-verified candidate created: ${normalizedEmail}`);

        return res.status(201).json({
          status: true,
          isEmailVerified: true,
          message: "Account created successfully! Please sign in with your email and password.",
          user: {
            _id: newUser._id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
            isEmailVerified: true,
          },
        });
      }

      // Default fallback: create unverified and send OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

      const newUser = await UserModel.create({
        name: finalName,
        email: normalizedEmail,
        password: hashedPassword,
        role: role || "jobSeeker",
        image: finalImage || "",
        frontendUser: true,
        isEmailVerified: false,
        otp: otp,
        otpExpiresAt: otpExpiresAt,
      });

      console.log(`[AUTH] New candidate registered: ${normalizedEmail} (ID: ${newUser._id})`);

      await sendOtpEmail(normalizedEmail, finalName, otp);

      return res.status(201).json({
        status: true,
        requireOtp: true,
        email: normalizedEmail,
        message: "Registration successful! A 6-digit verification code has been sent to your email.",
      });
    } catch (err) {
      console.error("Error in user registration:", err);
      return res.status(500).json({
        status: false,
        message: "Internal server error during registration.",
        error: err.message,
      });
    }
  }

  /**
   * Verify Email OTP
   * Validates OTP and activates user account (isEmailVerified: true)
   * Returns JWT token on success
   */
  async verifyOtp(req, res) {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        return res.status(400).json({
          status: false,
          message: "Email and 6-digit OTP code are required.",
        });
      }

      const normalizedEmail = String(email).trim().toLowerCase();
      const user = await UserModel.findOne({ email: normalizedEmail });

      if (!user) {
        return res.status(404).json({
          status: false,
          message: "No account found with this email.",
        });
      }

      if (user.isEmailVerified) {
        const token = jwt.sign(
          {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            image: user.image,
          },
          SECRET_KEY,
          { expiresIn: "7d" }
        );

        return res.status(200).json({
          status: true,
          message: "Email is already verified.",
          token,
          user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            image: user.image,
            isEmailVerified: true,
            createdAt: user.createdAt,
          },
        });
      }

      const inputOtp = String(otp).trim();
      if (!user.otp || user.otp !== inputOtp) {
        return res.status(400).json({
          status: false,
          message: "Invalid verification code. Please check and try again.",
        });
      }

      if (user.otpExpiresAt && new Date() > new Date(user.otpExpiresAt)) {
        return res.status(400).json({
          status: false,
          message: "Verification code has expired. Please click Resend OTP.",
        });
      }

      // Mark email as verified and clear OTP
      user.isEmailVerified = true;
      user.otp = null;
      user.otpExpiresAt = null;
      await user.save();

      const token = jwt.sign(
        {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          image: user.image,
        },
        SECRET_KEY,
        { expiresIn: "7d" }
      );

      console.log(`[AUTH] Candidate email verified successfully: ${normalizedEmail}`);

      return res.status(200).json({
        status: true,
        message: "Email verified successfully! Welcome to WorkSphere.",
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          image: user.image,
          isEmailVerified: true,
          createdAt: user.createdAt,
        },
      });
    } catch (err) {
      console.error("Error in OTP verification:", err);
      return res.status(500).json({
        status: false,
        message: "Internal server error during OTP verification.",
        error: err.message,
      });
    }
  }

  /**
   * Resend Verification OTP
   */
  async resendOtp(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          status: false,
          message: "Email is required.",
        });
      }

      const normalizedEmail = String(email).trim().toLowerCase();
      const user = await UserModel.findOne({ email: normalizedEmail });

      if (!user) {
        return res.status(404).json({
          status: false,
          message: "No account found with this email.",
        });
      }

      if (user.isEmailVerified) {
        return res.status(400).json({
          status: false,
          message: "Your email is already verified. You can log in directly.",
        });
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      user.otp = otp;
      user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      await user.save();

      await sendOtpEmail(normalizedEmail, user.name, otp);

      return res.status(200).json({
        status: true,
        message: "A new 6-digit verification code has been sent to your email.",
        email: normalizedEmail,
      });
    } catch (err) {
      console.error("Error in resend OTP:", err);
      return res.status(500).json({
        status: false,
        message: "Internal server error while resending OTP.",
        error: err.message,
      });
    }
  }

  /**
   * User Login with email & password
   * Blocks unverified frontend users with requireOtp: true
   */
  async loginUser(req, res) {
    try {
      const { email, password } = req.body;

      if (!email) {
        return res.status(400).json({
          status: false,
          message: "Email is required.",
        });
      }

      const normalizedEmail = String(email).trim().toLowerCase();
      const user = await UserModel.findOne({ email: normalizedEmail });

      if (!user) {
        return res.status(404).json({
          status: false,
          message: "No account found with this email. Please sign up first.",
        });
      }

      if (password) {
        const isPasswordMatched = await comparePassword(
          String(password),
          user.password
        );
        if (!isPasswordMatched) {
          return res.status(400).json({
            status: false,
            message: "Invalid credentials. Please check your password.",
          });
        }
      }

      // Check if candidate needs email verification
      if (user.frontendUser && !user.isEmailVerified) {
        // Generate new OTP and send
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.otp = otp;
        user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await user.save();
        await sendOtpEmail(user.email, user.name, otp);

        return res.status(403).json({
          status: false,
          requireOtp: true,
          email: user.email,
          message: "Please verify your email before logging in. A new verification code has been sent to your email.",
        });
      }

      const token = jwt.sign(
        {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          image: user.image,
        },
        SECRET_KEY,
        { expiresIn: "7d" }
      );

      return res.status(200).json({
        status: true,
        message: "Logged in successfully.",
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          image: user.image,
          isEmailVerified: user.isEmailVerified,
          createdAt: user.createdAt,
        },
        token,
      });
    } catch (err) {
      console.error("Error in user login:", err);
      return res.status(500).json({
        status: false,
        message: "Internal server error! Please try again later!",
        error: err.message,
      });
    }
  }

  /**
   * Get Current User Profile
   */
  async getUserProfile(req, res) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res
          .status(401)
          .json({ status: false, message: "Authorization header required" });
      }

      const token = authHeader.replace(/^Bearer\s+/, "");
      const decoded = jwt.verify(token, SECRET_KEY);
      const user = await UserModel.findById(decoded._id).select("-password -otp -otpExpiresAt");

      if (!user) {
        return res
          .status(404)
          .json({ status: false, message: "User not found" });
      }

      return res.status(200).json({
        status: true,
        user,
      });
    } catch (err) {
      return res.status(401).json({
        status: false,
        message: "Invalid or expired token.",
        error: err.message,
      });
    }
  }

  /**
   * List Users (with optional role & search filtering)
   */
  async getAllUsers(req, res) {
    try {
      const { role, search, page = 1, limit = 50 } = req.query;
      const filter = {};
      if (role && ["jobSeeker", "employer", "admin"].includes(role)) {
        filter.role = role;
      }
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ];
      }
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
      const skip = (pageNum - 1) * limitNum;
      const total = await UserModel.countDocuments(filter);
      const users = await UserModel.find(filter)
        .select("-password -otp -otpExpiresAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum);

      return res.status(200).json({
        status: true,
        message: "Users retrieved successfully.",
        total,
        page: pageNum,
        limit: limitNum,
        data: users,
      });
    } catch (err) {
      console.error("getAllUsers error:", err);
      return res.status(500).json({
        status: false,
        message: "Failed to retrieve users.",
        error: err.message,
      });
    }
  }

  /**
   * Get Single User by ID
   */
  async getUserById(req, res) {
    try {
      const { id } = req.params;
      const user = await UserModel.findById(id).select("-password -otp -otpExpiresAt");
      if (!user) {
        return res.status(404).json({
          status: false,
          message: "User not found.",
        });
      }
      return res.status(200).json({
        status: true,
        message: "User details retrieved successfully.",
        data: user,
      });
    } catch (err) {
      console.error("getUserById error:", err);
      return res.status(500).json({
        status: false,
        message: "Failed to retrieve user.",
        error: err.message,
      });
    }
  }

  /**
   * Update User API
   */
  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { name, email, role, isEmailVerified, password } = req.body;

      const updateData = {};
      if (name) updateData.name = String(name).trim();
      if (email) {
        const normalizedEmail = String(email).trim().toLowerCase();
        const existing = await UserModel.findOne({ email: normalizedEmail, _id: { $ne: id } });
        if (existing) {
          return res.status(400).json({
            status: false,
            message: "Email is already taken by another account.",
          });
        }
        updateData.email = normalizedEmail;
      }
      if (role && ["jobSeeker", "employer", "admin"].includes(role)) {
        updateData.role = role;
      }
      if (typeof isEmailVerified !== "undefined") {
        updateData.isEmailVerified = isEmailVerified === true || isEmailVerified === "true";
      }
      if (password && password.length >= 6) {
        updateData.password = await hashPassword(password);
      }
      if (req.file) {
        updateData.image = getUploadedFileName(req.file);
      } else if (req.body.image) {
        updateData.image = getUploadedFileName(req.body.image);
      }

      const updatedUser = await UserModel.findByIdAndUpdate(id, updateData, { new: true }).select("-password -otp -otpExpiresAt");
      if (!updatedUser) {
        return res.status(404).json({
          status: false,
          message: "User not found.",
        });
      }

      return res.status(200).json({
        status: true,
        message: "User updated successfully.",
        data: updatedUser,
      });
    } catch (err) {
      console.error("updateUser error:", err);
      return res.status(500).json({
        status: false,
        message: "Failed to update user.",
        error: err.message,
      });
    }
  }

  /**
   * Delete User API
   */
  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      const user = await UserModel.findByIdAndDelete(id);
      if (!user) {
        return res.status(404).json({
          status: false,
          message: "User not found.",
        });
      }
      return res.status(200).json({
        status: true,
        message: "User deleted successfully.",
      });
    } catch (err) {
      console.error("deleteUser error:", err);
      return res.status(500).json({
        status: false,
        message: "Failed to delete user.",
        error: err.message,
      });
    }
  }
}

module.exports = new UserController();
