import { query, sql, type Executor } from '../config/database';

/**
 * Ghi người thực hiện vào SESSION_CONTEXT để trigger (audit, lịch sử, sổ kho) biết ai thao tác.
 * Gọi ngay đầu transaction, trước mọi câu lệnh ghi dữ liệu.
 */
export async function setActor(exec: Executor, userId: number | null): Promise<void> {
  await query(
    `EXEC sp_set_session_context @key = N'user_id', @value = @userId;`,
    { userId: [sql.Int, userId] },
    exec,
  );
}
