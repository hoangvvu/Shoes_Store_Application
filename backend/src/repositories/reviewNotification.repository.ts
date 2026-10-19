import { query, sql, type Executor } from '../config/database';

/**
 * Chỉ phần M14 cần: gửi 1 thông báo tới 1 khách khi có phản hồi đánh giá.
 * Quản lý/danh sách thông báo là phần M13 (notifications, notification_recipients).
 */
export const reviewNotificationRepository = {
  async notifyCustomer(
    d: { customerId: number; createdByEmployeeId: number; title: string; content: string; linkUrl: string | null },
    exec?: Executor,
  ): Promise<void> {
    const n = await query<{ id: number }>(
      `INSERT INTO notifications (title, content, notification_type, target_type, link_url, created_by)
       VALUES (@title, @content, 'OTHER', 'SELECTED', @link, @by);
       SELECT CAST(SCOPE_IDENTITY() AS INT) AS id;`,
      {
        title: [sql.NVarChar(150), d.title],
        content: [sql.NVarChar(sql.MAX), d.content],
        link: [sql.VarChar(500), d.linkUrl],
        by: [sql.Int, d.createdByEmployeeId],
      },
      exec,
    );
    await query(
      `INSERT INTO notification_recipients (notification_id, customer_id) VALUES (@n, @c)`,
      { n: [sql.Int, n.recordset[0].id], c: [sql.Int, d.customerId] },
      exec,
    );
  },
};
