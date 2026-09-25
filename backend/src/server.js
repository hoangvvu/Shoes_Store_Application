const app = require('./app');
const { env, prisma } = require('./config');

const server = app.listen(env.PORT, async () => {
  try {
    // Kiểm tra kết nối tới Serverless PostgreSQL (Neon)
    await prisma.$connect();
    console.log('====================================================');
    console.log(`🚀 SHOES STORE BACKEND CORE ĐANG CHẠY THÀNH CÔNG!`);
    console.log(`📡 URL API       : http://localhost:${env.PORT}/api`);
    console.log(`🩺 Health Check  : http://localhost:${env.PORT}/api/health`);
    console.log(`🐘 Database Host : Serverless PostgreSQL (Neon Cloud)`);
    console.log(`⚙️  Môi trường    : ${env.NODE_ENV.toUpperCase()}`);
    console.log('====================================================');
  } catch (error) {
    console.error('❌ Lỗi kết nối Cơ sở dữ liệu PostgreSQL:', error.message);
  }
});

// Xử lý đóng kết nối an toàn khi server dừng (Graceful Shutdown)
const handleGracefulShutdown = async (signal) => {
  console.log(`\n🛑 Nhận tín hiệu ${signal}. Đang đóng HTTP Server và kết nối Database...`);
  server.close(async () => {
    await prisma.$disconnect();
    console.log('✅ Đã đóng kết nối an toàn. Tạm biệt!');
    process.exit(0);
  });
};

process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
