const AppError = require('../errors/AppError');

const notFound = (req, res, next) => {
  next(new AppError(`Đường dẫn ${req.originalUrl} không tồn tại trên máy chủ!`, 404));
};

module.exports = notFound;
