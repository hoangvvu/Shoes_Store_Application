import { query, sql, type Executor } from '../config/database';
import type { ResetTokenRow } from '../types/passwordReset.types';

/** Giữ re-export để các file cũ import kiểu từ repository vẫn chạy; có thể bỏ sau khi đổi import. */
export type { ResetTokenRow } from '../types/passwordReset.types';

/** Bảng password_reset_tokens nằm sẵn trong database/shoestore_schema.sql (mục 5). */
export const passwordResetRepository = {
  async invalidateAll(userId: number, exec?: Executor): Promise<void> {
    await query(
      `UPDATE password_reset_tokens SET used_at = SYSUTCDATETIME() WHERE user_id = @userId AND used_at IS NULL`,
      { userId: [sql.Int, userId] },
      exec,
    );
  },

  async create(userId: number, tokenHash: string, ttlMinutes: number, exec?: Executor): Promise<void> {
    await query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES (@userId, @hash, DATEADD(MINUTE, @ttl, SYSUTCDATETIME()))`,
      {
        userId: [sql.Int, userId],
        hash: [sql.VarChar(255), tokenHash],
        ttl: [sql.Int, ttlMinutes],
      },
      exec,
    );
  },

  async findLatestValid(userId: number, exec?: Executor): Promise<ResetTokenRow | null> {
    const r = await query<ResetTokenRow>(
      `SELECT TOP 1 token_id AS tokenId, token_hash AS tokenHash
       FROM password_reset_tokens
       WHERE user_id = @userId AND used_at IS NULL AND expires_at > SYSUTCDATETIME()
       ORDER BY token_id DESC`,
      { userId: [sql.Int, userId] },
      exec,
    );
    return r.recordset[0] ?? null;
  },

  async markUsed(tokenId: number, exec?: Executor): Promise<void> {
    await query(
      `UPDATE password_reset_tokens SET used_at = SYSUTCDATETIME() WHERE token_id = @id`,
      { id: [sql.Int, tokenId] },
      exec,
    );
  },
};
