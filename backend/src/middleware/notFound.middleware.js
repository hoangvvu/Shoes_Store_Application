const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    code: 'NOT_FOUND',
    message: `Đường dẫn [${req.method}] ${req.originalUrl} không tồn tại trên hệ thống`,
    details: null,
  });
};

module.exports = notFound;
