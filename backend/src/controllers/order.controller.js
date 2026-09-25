const { orderService } = require('../services');
const { sendSuccess } = require('../utils/response.util');
const asyncHandler = require('../utils/asyncHandler');

class OrderController {
  createOrder = asyncHandler(async (req, res) => {
    const order = await orderService.createOrder(req.user.id, req.body);
    sendSuccess(res, order, 'Đặt hàng thành công', 201);
  });

  getMyOrders = asyncHandler(async (req, res) => {
    const orders = await orderService.getUserOrders(req.user.id, req.query);
    sendSuccess(res, orders, 'Lấy danh sách đơn hàng thành công', 200);
  });

  getOrderDetail = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const order = await orderService.getOrderDetail(id);
    sendSuccess(res, order, 'Lấy chi tiết đơn hàng thành công', 200);
  });
}

module.exports = new OrderController();
