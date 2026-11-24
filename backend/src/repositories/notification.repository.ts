import { query, sql, withTransaction, type Executor } from '../config/database';
import type {
  AdminNotificationDetail,
  AdminNotificationItem,
  CreateNotificationInput,
  CustomerNotificationItem,
} from '../types/notification.types';

export const notificationRepository = {
  /**
   * Tạo thông báo gửi cho 1 khách hàng cụ thể (dùng trong Transaction hủy đơn, trả hàng, phản hồi đánh giá)
   */
  async createForCustomer(
    data: {
      title: string;
      content: string;
      notificationType: 'ORDER' | 'SYSTEM' | 'PROMOTION' | 'OTHER';
      linkUrl?: string | null;
      customerId: number;
      createdByEmployeeId: number;
    },
    exec?: Executor,
  ): Promise<number> {
    const res = await query<{ id: number }>(
      `INSERT INTO notifications (title, content, notification_type, target_type, link_url, created_by)
       VALUES (@title, @content, @type, 'SELECTED', @linkUrl, @createdBy);
       SELECT CAST(SCOPE_IDENTITY() AS INT) AS id;`,
      {
        title: [sql.NVarChar(150), data.title],
        content: [sql.NVarChar(sql.MAX), data.content],
        type: [sql.VarChar(10), data.notificationType],
        linkUrl: [sql.VarChar(500), data.linkUrl ?? null],
        createdBy: [sql.Int, data.createdByEmployeeId],
      },
      exec,
    );
    const notificationId = res.recordset[0].id;

    await query(
      `INSERT INTO notification_recipients (notification_id, customer_id, is_read, is_deleted)
       VALUES (@notificationId, @customerId, 0, 0);`,
      {
        notificationId: [sql.Int, notificationId],
        customerId: [sql.Int, data.customerId],
      },
      exec,
    );

    return notificationId;
  },

  /**
   * Quản trị viên tạo và phát tán thông báo (ALL hoặc SELECTED)
   * Sử dụng câu lệnh set-based INSERT ... SELECT theo yêu cầu đặc tả (không dùng vòng lặp)
   */
  async createNotification(
    data: CreateNotificationInput,
    employeeId: number,
  ): Promise<number> {
    return await withTransaction(async (tx) => {
      const res = await query<{ id: number }>(
        `INSERT INTO notifications (
           title, content, notification_type, target_type, link_url, promotion_id, created_by
         )
         VALUES (
           @title, @content, @type, @targetType, @linkUrl, @promotionId, @createdBy
         );
         SELECT CAST(SCOPE_IDENTITY() AS INT) AS id;`,
        {
          title: [sql.NVarChar(150), data.title],
          content: [sql.NVarChar(sql.MAX), data.content],
          type: [sql.VarChar(10), data.notificationType],
          targetType: [sql.VarChar(10), data.targetType],
          linkUrl: [sql.VarChar(500), data.linkUrl ?? null],
          promotionId: [sql.Int, data.promotionId ?? null],
          createdBy: [sql.Int, employeeId],
        },
        tx,
      );
      const notificationId = res.recordset[0].id;

      if (data.targetType === 'ALL') {
        // Phát tán theo tập cho tất cả khách hàng chưa bị xóa mềm
        await query(
          `INSERT INTO notification_recipients (notification_id, customer_id, is_read, is_deleted)
           SELECT @notificationId, customer_id, 0, 0
           FROM customers
           WHERE is_deleted = 0;`,
          { notificationId: [sql.Int, notificationId] },
          tx,
        );
      } else if (data.customerIds && data.customerIds.length > 0) {
        // Đối tượng là danh sách khách hàng được chọn
        const uniqueIds = Array.from(new Set(data.customerIds));
        // Chia batch để an toàn khi danh sách lớn
        const batchSize = 1000;
        for (let i = 0; i < uniqueIds.length; i += batchSize) {
          const slice = uniqueIds.slice(i, i + batchSize);
          const valuesClause = slice.map((_, idx) => `(@notificationId, @c${idx}, 0, 0)`).join(', ');
          const params: Record<string, [any, any]> = {
            notificationId: [sql.Int, notificationId],
          };
          slice.forEach((cid, idx) => {
            params[`c${idx}`] = [sql.Int, cid];
          });
          await query(
            `INSERT INTO notification_recipients (notification_id, customer_id, is_read, is_deleted)
             VALUES ${valuesClause};`,
            params,
            tx,
          );
        }
      }

      return notificationId;
    });
  },

  /** Đếm số thông báo chưa đọc của khách hàng */
  async countUnread(customerId: number): Promise<number> {
    const r = await query<{ cnt: number }>(
      `SELECT COUNT(*) AS cnt 
       FROM notification_recipients nr
       JOIN notifications n ON n.notification_id = nr.notification_id
       WHERE nr.customer_id = @customerId 
         AND nr.is_read = 0 
         AND nr.is_deleted = 0 
         AND n.is_deleted = 0;`,
      { customerId: [sql.Int, customerId] },
    );
    return r.recordset[0]?.cnt ?? 0;
  },

  /** Danh sách thông báo của khách hàng (hộp thư) */
  async listForCustomer(
    customerId: number,
    offset: number,
    limit: number,
  ): Promise<{ items: CustomerNotificationItem[]; total: number }> {
    const listRes = await query<CustomerNotificationItem>(
      `SELECT 
         n.notification_id AS notificationId,
         n.title,
         n.content,
         n.notification_type AS notificationType,
         n.link_url AS linkUrl,
         nr.is_read AS isRead,
         nr.read_at AS readAt,
         n.created_at AS createdAt
       FROM notification_recipients nr
       JOIN notifications n ON n.notification_id = nr.notification_id
       WHERE nr.customer_id = @customerId
         AND nr.is_deleted = 0
         AND n.is_deleted = 0
       ORDER BY n.created_at DESC
       OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;`,
      {
        customerId: [sql.Int, customerId],
        offset: [sql.Int, offset],
        limit: [sql.Int, limit],
      },
    );

    const countRes = await query<{ total: number }>(
      `SELECT COUNT(*) AS total
       FROM notification_recipients nr
       JOIN notifications n ON n.notification_id = nr.notification_id
       WHERE nr.customer_id = @customerId
         AND nr.is_deleted = 0
         AND n.is_deleted = 0;`,
      { customerId: [sql.Int, customerId] },
    );

    return {
      items: listRes.recordset,
      total: countRes.recordset[0]?.total ?? 0,
    };
  },

  /** Đánh dấu 1 thông báo là đã đọc đối với khách hàng */
  async markAsRead(notificationId: number, customerId: number): Promise<void> {
    await query(
      `UPDATE notification_recipients
       SET is_read = 1, read_at = SYSUTCDATETIME()
       WHERE notification_id = @notificationId 
         AND customer_id = @customerId 
         AND is_read = 0;`,
      {
        notificationId: [sql.Int, notificationId],
        customerId: [sql.Int, customerId],
      },
    );
  },

  /** Đánh dấu tất cả thông báo của khách hàng là đã đọc */
  async markAllAsRead(customerId: number): Promise<void> {
    await query(
      `UPDATE notification_recipients
       SET is_read = 1, read_at = SYSUTCDATETIME()
       WHERE customer_id = @customerId 
         AND is_read = 0;`,
      { customerId: [sql.Int, customerId] },
    );
  },

  /** Khách xóa mềm thông báo khỏi hộp thư của mình */
  async softDeleteForCustomer(notificationId: number, customerId: number): Promise<void> {
    await query(
      `UPDATE notification_recipients
       SET is_deleted = 1, deleted_at = SYSUTCDATETIME()
       WHERE notification_id = @notificationId AND customer_id = @customerId;`,
      {
        notificationId: [sql.Int, notificationId],
        customerId: [sql.Int, customerId],
      },
    );
  },

  /** Lịch sử thông báo đã gửi (Admin xem) */
  async listAdmin(
    filters: {
      type?: string;
      search?: string;
      offset: number;
      limit: number;
    },
  ): Promise<{ items: AdminNotificationItem[]; total: number }> {
    const conditions: string[] = ['n.is_deleted = 0'];
    const params: Record<string, [any, any]> = {
      offset: [sql.Int, filters.offset],
      limit: [sql.Int, filters.limit],
    };

    if (filters.type) {
      conditions.push('n.notification_type = @type');
      params.type = [sql.VarChar(10), filters.type];
    }

    if (filters.search) {
      conditions.push('(n.title LIKE @search OR n.content LIKE @search)');
      params.search = [sql.NVarChar(sql.MAX), `%${filters.search}%`];
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const listRes = await query<AdminNotificationItem>(
      `SELECT 
         n.notification_id AS notificationId,
         n.title,
         n.content,
         n.notification_type AS notificationType,
         n.target_type AS targetType,
         n.link_url AS linkUrl,
         n.promotion_id AS promotionId,
         n.created_at AS createdAt,
         n.created_by AS createdBy,
         (e.last_name + ' ' + e.first_name) AS createdByName,
         (SELECT COUNT(*) FROM notification_recipients nr WHERE nr.notification_id = n.notification_id) AS totalRecipients,
         (SELECT COUNT(*) FROM notification_recipients nr WHERE nr.notification_id = n.notification_id AND nr.is_read = 1) AS readCount
       FROM notifications n
       LEFT JOIN employees e ON e.employee_id = n.created_by
       ${whereClause}
       ORDER BY n.created_at DESC
       OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;`,
      params,
    );

    const countRes = await query<{ total: number }>(
      `SELECT COUNT(*) AS total
       FROM notifications n
       ${whereClause};`,
      params,
    );

    return {
      items: listRes.recordset,
      total: countRes.recordset[0]?.total ?? 0,
    };
  },

  /** Chi tiết 1 thông báo và thống kê / danh sách người nhận (Admin) */
  async getAdminDetail(notificationId: number): Promise<AdminNotificationDetail | null> {
    const res = await query<AdminNotificationItem>(
      `SELECT 
         n.notification_id AS notificationId,
         n.title,
         n.content,
         n.notification_type AS notificationType,
         n.target_type AS targetType,
         n.link_url AS linkUrl,
         n.promotion_id AS promotionId,
         n.created_at AS createdAt,
         n.created_by AS createdBy,
         (e.last_name + ' ' + e.first_name) AS createdByName,
         (SELECT COUNT(*) FROM notification_recipients nr WHERE nr.notification_id = n.notification_id) AS totalRecipients,
         (SELECT COUNT(*) FROM notification_recipients nr WHERE nr.notification_id = n.notification_id AND nr.is_read = 1) AS readCount
       FROM notifications n
       LEFT JOIN employees e ON e.employee_id = n.created_by
       WHERE n.notification_id = @id AND n.is_deleted = 0;`,
      { id: [sql.Int, notificationId] },
    );

    const item = res.recordset[0];
    if (!item) return null;

    // Lấy tối đa 100 người nhận đại diện để xem trên chi tiết
    const recRes = await query<{
      customerId: number;
      customerName: string;
      customerPhone: string | null;
      isRead: boolean;
      readAt: string | null;
    }>(
      `SELECT TOP 100
         c.customer_id AS customerId,
         (c.last_name + ' ' + c.first_name) AS customerName,
         c.phone AS customerPhone,
         nr.is_read AS isRead,
         nr.read_at AS readAt
       FROM notification_recipients nr
       JOIN customers c ON c.customer_id = nr.customer_id
       WHERE nr.notification_id = @id
       ORDER BY nr.is_read DESC, c.last_name ASC;`,
      { id: [sql.Int, notificationId] },
    );

    return {
      ...item,
      recipients: recRes.recordset,
    };
  },

  /** Admin xóa mềm thông báo */
  async softDeleteNotification(notificationId: number): Promise<boolean> {
    const res = await query(
      `UPDATE notifications
       SET is_deleted = 1, deleted_at = SYSUTCDATETIME()
       WHERE notification_id = @id AND is_deleted = 0;`,
      { id: [sql.Int, notificationId] },
    );
    return (res.rowsAffected[0] ?? 0) > 0;
  },
};
