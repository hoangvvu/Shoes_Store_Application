/**
 * Sends a standardized success response
 */
const sendSuccess = (res, data = null, message = 'Thành công', statusCode = 200, pagination = null) => {
  const payload = {
    success: true,
    message,
    data,
  };
  if (pagination) {
    payload.pagination = pagination;
  }
  return res.status(statusCode).json(payload);
};

/**
 * Sends a standardized error response adhering to { code, message, details }
 */
const sendError = (res, error, statusCode = 500) => {
  const code = error.code || 'INTERNAL_ERROR';
  const message = error.message || 'Đã có lỗi xảy ra';
  const details = error.details || null;

  return res.status(statusCode).json({
    success: false,
    code,
    message,
    details,
  });
};

module.exports = {
  sendSuccess,
  sendError,
};
