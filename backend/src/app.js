const express = require('express');
const cors = require('cors');
const { env } = require('./config');
const routes = require('./routes');
const { errorHandler, notFound } = require('./middleware');

const app = express();

// Cấu hình Middleware cơ bản
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Ghi log request đơn giản trong môi trường phát triển
if (env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
  });
}

// Gắn toàn bộ API Routes vào tiền tố /api
app.use('/api', routes);

// Trang chào mừng mặc định tại root /
app.get('/', (req, res) => {
  res.json({
    name: 'Shoes Store API Core',
    version: '1.0.0',
    documentation: '/api/health',
    message: 'Chào mừng đến với hệ sinh thái API Bán giày Thể thao Đa nền tảng!',
  });
});

// Xử lý Route không tồn tại (404)
app.use(notFound);

// Xử lý Lỗi tập trung (Error Handler)
app.use(errorHandler);

module.exports = app;
