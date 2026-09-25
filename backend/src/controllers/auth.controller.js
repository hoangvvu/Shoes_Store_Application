const { authService } = require('../services');
const { sendSuccess } = require('../utils/response.util');
const asyncHandler = require('../utils/asyncHandler');
const { AUTH_MESSAGES } = require('../constants/message.constant');

class AuthController {
  register = asyncHandler(async (req, res) => {
    const result = await authService.register(req.body);
    sendSuccess(res, result, AUTH_MESSAGES.REGISTER_SUCCESS, 201);
  });

  login = asyncHandler(async (req, res) => {
    const result = await authService.login(req.body);
    sendSuccess(res, result, AUTH_MESSAGES.LOGIN_SUCCESS, 200);
  });

  getMe = asyncHandler(async (req, res) => {
    const profile = await authService.getProfile(req.user.id);
    sendSuccess(res, profile, 'Lấy thông tin tài khoản thành công', 200);
  });
}

module.exports = new AuthController();
