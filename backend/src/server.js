const app = require('./app');
const { env, db } = require('./config');

const server = app.listen(env.PORT, async () => {
  try {
    // Kiểm tra kết nối tới Microsoft SQL Server
    await db.getPool();
    console.log('====================================================');
    console.log(`🚀 SHOES STORE BACKEND CORE ĐANG CHẠY THÀNH CÔNG!`);
    console.log(`📡 URL API v1     : http://localhost:${env.PORT}/api/v1`);
    console.log(`🩺 Health Check   : http://localhost:${env.PORT}/api/health`);
    console.log(`🗄️ Database Host  : Microsoft SQL Server (${env.DB_SERVER}:${env.DB_PORT}/${env.DB_NAME})`);
    console.log(`⚙️ Môi trường     : ${env.NODE_ENV.toUpperCase()}`);
    console.log('====================================================');
  } catch (error) {
    console.warn('⚠️ Cảnh báo kết nối CSDL Microsoft SQL Server:', error.message);
    console.log('💡 Hãy đảm bảo SQL Server đang chạy và cấu hình .env đã đúng thông số kết nối.');
  }
});

// Xử lý đóng kết nối an toàn khi server dừng (Graceful Shutdown)
const handleGracefulShutdown = async (signal) => {
  console.log(`\n🛑 Nhận tín hiệu ${signal}. Đang đóng HTTP Server và kết nối Database...`);
  server.close(async () => {
    await db.closePool();
    console.log('✅ Đã đóng kết nối an toàn. Tạm biệt!');
    process.exit(0);
  });
};

process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
