import bcrypt from 'bcryptjs';
import { BCRYPT_COST } from '../constants/auth.constant';

export const hashPassword = (plain: string) => bcrypt.hash(plain, BCRYPT_COST);
export const comparePassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);

// Hash giả để thời gian phản hồi khi sai username ≈ khi sai mật khẩu (chống dò username)
let dummy: string | null = null;
export async function dummyCompare(plain: string): Promise<void> {
  dummy ??= await bcrypt.hash('dummy-password', BCRYPT_COST);
  await bcrypt.compare(plain, dummy);
}
