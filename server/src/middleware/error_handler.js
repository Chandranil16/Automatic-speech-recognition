const multer = require('multer');
const errorhandler = (err, req, res, next) => {
  console.error(err.stack);

  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      error: "File upload error:" + err.message,
    });
  }

  res.status(500).json({
    error: err.message || "Internal Server Error",
  });
};
module.exports = errorhandler;
