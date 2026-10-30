const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const token = req.cookies && req.cookies.adminToken;
  if (!token) return res.redirect("/admin/login");

  try {
    const admin = jwt.verify(token, process.env.JWT_ACCESS_TOKEN_SECRET_KEY);
    if (admin.role !== "admin") return res.redirect("/admin/login?toast=login-failed");
    req.admin = admin;
    return next();
  } catch (err) {
    res.clearCookie("adminToken");
    return res.redirect("/admin/login?toast=login-failed");
  }
};
