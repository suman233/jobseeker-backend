const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const token = req.cookies && req.cookies.userToken;
  if (!token) return res.redirect("/login");

  try {
    const user = jwt.verify(token, process.env.JWT_ACCESS_TOKEN_SECRET_KEY);
    if (!["employer", "jobSeeker"].includes(user.role)) return res.redirect("/login");
    req.authUser = user;
    return next();
  } catch (err) {
    res.clearCookie("userToken");
    return res.redirect("/login?toast=login-failed");
  }
};
