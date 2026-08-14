const vendor = (req, res, next) => {
  // A user is a vendor if their role is "vendor" or they have vendor properties like businessType
  if (req.user && (req.user.role === "vendor" || req.user.businessType)) {
    next();
  } else {
    res.status(403).json({ success: false, message: "Not authorized as a vendor" });
  }
};

module.exports = vendor;
