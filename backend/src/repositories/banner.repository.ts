import { query, sql, type Executor, type Param } from '../config/database';
import type { Banner, BannerFilter, CreateBannerInput, UpdateBannerInput } from '../types/banner.types';

export const bannerRepository = {
  async list(filter?: BannerFilter, exec?: Executor): Promise<Banner[]> {
    const conditions: string[] = ['is_deleted = 0'];
    const params: Record<string, Param> = {};

    if (filter?.platform) {
      conditions.push('(platform = @platform OR platform = \'ALL\')');
      params.platform = [sql.VarChar(10), filter.platform];
    }
    if (filter?.position) {
      conditions.push('position = @position');
      params.position = [sql.VarChar(15), filter.position];
    }
    if (filter?.isActive !== undefined) {
      conditions.push('is_active = @isActive');
      params.isActive = [sql.Bit, filter.isActive ? 1 : 0];
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const r = await query<Banner>(
      `SELECT
         banner_id AS bannerId,
         title,
         image_url AS imageUrl,
         link_url AS linkUrl,
         position,
         platform,
         sort_order AS sortOrder,
         CONVERT(VARCHAR(23), start_date, 126) AS startDate,
         CONVERT(VARCHAR(23), end_date, 126) AS endDate,
         is_active AS isActive,
         promotion_id AS promotionId,
         created_by AS createdBy,
         CONVERT(VARCHAR(23), created_at, 126) AS createdAt
       FROM banners
       ${where}
       ORDER BY sort_order ASC, created_at DESC`,
      params,
      exec,
    );

    return r.recordset;
  },

  async findById(bannerId: number, exec?: Executor): Promise<Banner | null> {
    const r = await query<Banner>(
      `SELECT
         banner_id AS bannerId,
         title,
         image_url AS imageUrl,
         link_url AS linkUrl,
         position,
         platform,
         sort_order AS sortOrder,
         CONVERT(VARCHAR(23), start_date, 126) AS startDate,
         CONVERT(VARCHAR(23), end_date, 126) AS endDate,
         is_active AS isActive,
         promotion_id AS promotionId,
         created_by AS createdBy,
         CONVERT(VARCHAR(23), created_at, 126) AS createdAt
       FROM banners
       WHERE banner_id = @id AND is_deleted = 0`,
      { id: [sql.Int, bannerId] },
      exec,
    );
    return r.recordset[0] ?? null;
  },

  async create(data: CreateBannerInput, createdBy?: number | null, exec?: Executor): Promise<Banner> {
    const r = await query<Banner>(
      `INSERT INTO banners (
         title, image_url, link_url, position, platform, sort_order,
         start_date, end_date, is_active, promotion_id, created_by
       )
       OUTPUT
         inserted.banner_id AS bannerId,
         inserted.title,
         inserted.image_url AS imageUrl,
         inserted.link_url AS linkUrl,
         inserted.position,
         inserted.platform,
         inserted.sort_order AS sortOrder,
         CONVERT(VARCHAR(23), inserted.start_date, 126) AS startDate,
         CONVERT(VARCHAR(23), inserted.end_date, 126) AS endDate,
         inserted.is_active AS isActive,
         inserted.promotion_id AS promotionId,
         inserted.created_by AS createdBy,
         CONVERT(VARCHAR(23), inserted.created_at, 126) AS createdAt
       VALUES (
         @title, @imageUrl, @linkUrl, @position, @platform, @sortOrder,
         COALESCE(@startDate, SYSUTCDATETIME()), @endDate, @isActive, @promotionId, @createdBy
       )`,
      {
        title: [sql.NVarChar(150), data.title],
        imageUrl: [sql.VarChar(500), data.imageUrl],
        linkUrl: [sql.VarChar(500), data.linkUrl ?? null],
        position: [sql.VarChar(15), data.position ?? 'HOME_TOP'],
        platform: [sql.VarChar(10), data.platform ?? 'ALL'],
        sortOrder: [sql.Int, data.sortOrder ?? 0],
        startDate: [sql.DateTime2, data.startDate ? new Date(data.startDate) : null],
        endDate: [sql.DateTime2, data.endDate ? new Date(data.endDate) : null],
        isActive: [sql.Bit, data.isActive !== false ? 1 : 0],
        promotionId: [sql.Int, data.promotionId ?? null],
        createdBy: [sql.Int, createdBy ?? null],
      },
      exec,
    );
    return r.recordset[0];
  },

  async update(bannerId: number, data: UpdateBannerInput, exec?: Executor): Promise<Banner | null> {
    const existing = await this.findById(bannerId, exec);
    if (!existing) return null;

    const r = await query<Banner>(
      `UPDATE banners
       SET
         title = COALESCE(@title, title),
         image_url = COALESCE(@imageUrl, image_url),
         link_url = CASE WHEN @hasLinkUrl = 1 THEN @linkUrl ELSE link_url END,
         position = COALESCE(@position, position),
         platform = COALESCE(@platform, platform),
         sort_order = COALESCE(@sortOrder, sort_order),
         start_date = COALESCE(@startDate, start_date),
         end_date = CASE WHEN @hasEndDate = 1 THEN @endDate ELSE end_date END,
         is_active = COALESCE(@isActive, is_active),
         promotion_id = CASE WHEN @hasPromo = 1 THEN @promotionId ELSE promotion_id END
       OUTPUT
         inserted.banner_id AS bannerId,
         inserted.title,
         inserted.image_url AS imageUrl,
         inserted.link_url AS linkUrl,
         inserted.position,
         inserted.platform,
         inserted.sort_order AS sortOrder,
         CONVERT(VARCHAR(23), inserted.start_date, 126) AS startDate,
         CONVERT(VARCHAR(23), inserted.end_date, 126) AS endDate,
         inserted.is_active AS isActive,
         inserted.promotion_id AS promotionId,
         inserted.created_by AS createdBy,
         CONVERT(VARCHAR(23), inserted.created_at, 126) AS createdAt
       WHERE banner_id = @id AND is_deleted = 0`,
      {
        id: [sql.Int, bannerId],
        title: [sql.NVarChar(150), data.title ?? null],
        imageUrl: [sql.VarChar(500), data.imageUrl ?? null],
        linkUrl: [sql.VarChar(500), data.linkUrl ?? null],
        hasLinkUrl: [sql.Bit, data.linkUrl !== undefined ? 1 : 0],
        position: [sql.VarChar(15), data.position ?? null],
        platform: [sql.VarChar(10), data.platform ?? null],
        sortOrder: [sql.Int, data.sortOrder ?? null],
        startDate: [sql.DateTime2, data.startDate ? new Date(data.startDate) : null],
        endDate: [sql.DateTime2, data.endDate ? new Date(data.endDate) : null],
        hasEndDate: [sql.Bit, data.endDate !== undefined ? 1 : 0],
        isActive: [sql.Bit, data.isActive !== undefined ? (data.isActive ? 1 : 0) : null],
        promotionId: [sql.Int, data.promotionId ?? null],
        hasPromo: [sql.Bit, data.promotionId !== undefined ? 1 : 0],
      },
      exec,
    );
    return r.recordset[0] ?? null;
  },

  async delete(bannerId: number, exec?: Executor): Promise<boolean> {
    const r = await query(
      `UPDATE banners
       SET is_deleted = 1, deleted_at = SYSUTCDATETIME()
       WHERE banner_id = @id AND is_deleted = 0`,
      { id: [sql.Int, bannerId] },
      exec,
    );
    return (r.rowsAffected[0] ?? 0) > 0;
  },
};
