import app from './app';
import { getPool } from './config/database';
import { env } from './config/env';

async function main() {
  await getPool(); // fail sớm nếu không kết nối được SQL Server
  console.log(`Đã kết nối SQL Server (${env.DB_SERVER}/${env.DB_NAME})`);
  app.listen(env.PORT, () => console.log(`API chạy tại http://localhost:${env.PORT}/api/v1`));
}

main().catch((err) => {
  console.error('Không thể khởi động server:', err);
  process.exit(1);
});
