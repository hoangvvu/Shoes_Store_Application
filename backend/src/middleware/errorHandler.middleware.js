const { AppError } = require('../errors');

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'Lỗi máy chủ nội bộ';
  let details = err.details || null;

  // Handle SQL Server specific errors
  if (err.number) {
    switch (err.number) {
      case 2601:
      case 2627:
        statusCode = 409;
        code = 'DUPLICATE_ENTRY';
        message = 'Dữ liệu đã tồn tại trong hệ thống (vi phạm ràng buộc duy nhất)';
        break;
      case 547:
        statusCode = 400;
        code = 'FOREIGN_KEY_VIOLATION';
        message = 'Dữ liệu tham chiếu không hợp lệ hoặc đang được sử dụng ở bảng khác';
        break;
      case 50020:
        statusCode = 400;
        code = 'EMPLOYEE_HAS_PENDING_ORDERS';
        message = 'Nhân viên còn đơn đang xử lý, hãy bàn giao trước';
        break;
      case 51010:
        statusCode = 404;
        code = 'VARIANT_NOT_FOUND';
        message = 'Biến thể sản phẩm không tồn tại';
        break;
      case 51011:
        statusCode = 400;
        code = 'INSUFFICIENT_STOCK';
        message = 'Không đủ tồn kho để thực hiện giao dịch';
        break;
      case 51012:
        statusCode = 400;
        code = 'LEDGER_IMMUTABLE';
        message = 'Sổ kho không được phép sửa hoặc xóa trực tiếp';
        break;
      case 51013:
        statusCode = 400;
        code = 'DIRECT_STOCK_UPDATE_FORBIDDEN';
        message = 'Không được sửa số lượng tồn kho trực tiếp, phải qua sổ kho';
        break;
      case 51020:
        statusCode = 400;
        code = 'RECEIPT_DELETED';
        message = 'Phiếu nhập đã bị xóa, không thể thao tác';
        break;
      case 51021:
        statusCode = 400;
        code = 'RECEIPT_DETAILS_LOCKED';
        message = 'Chi tiết phiếu nhập đã ghi kho, không thể sửa/xóa';
        break;
      case 51022:
        statusCode = 400;
        code = 'CANNOT_RESTORE_RECEIPT';
        message = 'Không thể khôi phục phiếu nhập đã xóa';
        break;
      case 51070:
        statusCode = 400;
        code = 'ORDER_STATUS_UNCHANGED';
        message = 'Đơn hàng không tồn tại, đã bị xóa hoặc đã ở trạng thái này';
        break;
      case 51071:
        statusCode = 400;
        code = 'INVALID_ADJUST_QUANTITY';
        message = 'Số lượng điều chỉnh kho phải khác 0';
        break;
      default:
        // Other custom throws
        if (err.number >= 50000) {
          statusCode = 400;
          code = 'BUSINESS_RULE_VIOLATION';
          message = err.message;
        }
        break;
    }
  }

  if (process.env.NODE_ENV === 'development') {
    console.error('💥 [ErrorHandler]:', err);
  }

  res.status(statusCode).json({
    success: false,
    code,
    message,
    details,
  });
};

module.exports = errorHandler;
