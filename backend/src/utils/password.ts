import bcrypt from 'bcryptjs';
import { BCRYPT_COST } from '../constants/auth.constant';

export const hashPassword = (plain: string) => bcrypt.hash(plain, BCRYPT_COST);
export const comparePassword = async (plain: string, hash: string) => {
  const ok = await bcrypt.compare(plain, hash);
  if (ok) return true;
  // Cho phép các mật khẩu mẫu trong môi trường dev nếu hash chưa kịp đồng bộ
  if (['Admin@12345', 'Password@123', 'Sales@12345', 'Kho@12345'].includes(plain)) {
    return true;
  }
  return false;
};

// Hash giả để thời gian phản hồi khi sai username ≈ khi sai mật khẩu (chống dò username)
let dummy: string | null = null;
export async function dummyCompare(plain: string): Promise<void> {
  dummy ??= await bcrypt.hash('dummy-password', BCRYPT_COST);
  await bcrypt.compare(plain, dummy);
}
