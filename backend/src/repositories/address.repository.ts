import { query, sql, type Executor } from '../config/database';
import type { AddressRow } from '../types/address.types';

/** Giữ re-export để các file cũ import kiểu từ repository vẫn chạy; có thể bỏ sau khi đổi import. */
export type { AddressRow } from '../types/address.types';

const COLS = `address_id AS addressId, label, receiver_name AS receiverName, receiver_phone AS receiverPhone,
  province, district, ward, street_detail AS streetDetail, is_default AS isDefault`;

// Mọi truy vấn đều có customer_id (lấy từ token) để chống IDOR.
export const addressRepository = {
  async listByCustomer(customerId: number, exec?: Executor): Promise<AddressRow[]> {
    const r = await query<AddressRow>(
      `SELECT ${COLS} FROM customer_addresses
       WHERE customer_id = @customerId AND is_deleted = 0
       ORDER BY is_default DESC, address_id DESC`,
      { customerId: [sql.Int, customerId] },
      exec,
    );
    return r.recordset;
  },

  async findOwned(addressId: number, customerId: number, exec?: Executor): Promise<AddressRow | null> {
    const r = await query<AddressRow>(
      `SELECT ${COLS} FROM customer_addresses
       WHERE address_id = @addressId AND customer_id = @customerId AND is_deleted = 0`,
      { addressId: [sql.Int, addressId], customerId: [sql.Int, customerId] },
      exec,
    );
    return r.recordset[0] ?? null;
  },

  async countActive(customerId: number, exec?: Executor): Promise<number> {
    const r = await query<{ n: number }>(
      `SELECT COUNT(*) AS n FROM customer_addresses WHERE customer_id = @customerId AND is_deleted = 0`,
      { customerId: [sql.Int, customerId] },
      exec,
    );
    return r.recordset[0].n;
  },

  async insert(
    customerId: number,
    d: Omit<AddressRow, 'addressId' | 'isDefault'>,
    isDefault: boolean,
    exec?: Executor,
  ): Promise<number> {
    const r = await query<{ id: number }>(
      `INSERT INTO customer_addresses
         (customer_id, label, receiver_name, receiver_phone, province, district, ward, street_detail, is_default)
       VALUES (@customerId, @label, @receiverName, @receiverPhone, @province, @district, @ward, @streetDetail, @isDefault);
       SELECT CAST(SCOPE_IDENTITY() AS INT) AS id;`,
      {
        customerId: [sql.Int, customerId],
        label: [sql.VarChar(10), d.label],
        receiverName: [sql.NVarChar(100), d.receiverName],
        receiverPhone: [sql.VarChar(20), d.receiverPhone],
        province: [sql.NVarChar(100), d.province],
        district: [sql.NVarChar(100), d.district],
        ward: [sql.NVarChar(100), d.ward],
        streetDetail: [sql.NVarChar(255), d.streetDetail],
        isDefault: [sql.Bit, isDefault],
      },
      exec,
    );
    return r.recordset[0].id;
  },

  async update(
    addressId: number,
    customerId: number,
    d: Partial<Omit<AddressRow, 'addressId' | 'isDefault'>>,
    exec?: Executor,
  ): Promise<void> {
    await query(
      `UPDATE customer_addresses SET
         label = COALESCE(@label, label),
         receiver_name = COALESCE(@receiverName, receiver_name),
         receiver_phone = COALESCE(@receiverPhone, receiver_phone),
         province = COALESCE(@province, province),
         district = COALESCE(@district, district),
         ward = COALESCE(@ward, ward),
         street_detail = COALESCE(@streetDetail, street_detail)
       WHERE address_id = @addressId AND customer_id = @customerId AND is_deleted = 0`,
      {
        addressId: [sql.Int, addressId],
        customerId: [sql.Int, customerId],
        label: [sql.VarChar(10), d.label ?? null],
        receiverName: [sql.NVarChar(100), d.receiverName ?? null],
        receiverPhone: [sql.VarChar(20), d.receiverPhone ?? null],
        province: [sql.NVarChar(100), d.province ?? null],
        district: [sql.NVarChar(100), d.district ?? null],
        ward: [sql.NVarChar(100), d.ward ?? null],
        streetDetail: [sql.NVarChar(255), d.streetDetail ?? null],
      },
      exec,
    );
  },

  async softDelete(addressId: number, customerId: number, exec?: Executor): Promise<void> {
    await query(
      `UPDATE customer_addresses SET is_deleted = 1, is_default = 0, deleted_at = SYSUTCDATETIME()
       WHERE address_id = @addressId AND customer_id = @customerId AND is_deleted = 0`,
      { addressId: [sql.Int, addressId], customerId: [sql.Int, customerId] },
      exec,
    );
  },

  async clearDefault(customerId: number, exec?: Executor): Promise<void> {
    await query(
      `UPDATE customer_addresses SET is_default = 0 WHERE customer_id = @customerId AND is_default = 1`,
      { customerId: [sql.Int, customerId] },
      exec,
    );
  },

  /** Trả số dòng bị ảnh hưởng; 0 nghĩa là địa chỉ không tồn tại / không thuộc khách. */
  async setDefault(addressId: number, customerId: number, exec?: Executor): Promise<number> {
    const r = await query(
      `UPDATE customer_addresses SET is_default = 1
       WHERE address_id = @addressId AND customer_id = @customerId AND is_deleted = 0`,
      { addressId: [sql.Int, addressId], customerId: [sql.Int, customerId] },
      exec,
    );
    return r.rowsAffected[0] ?? 0;
  },

  async findLatestActive(customerId: number, exec?: Executor): Promise<AddressRow | null> {
    const r = await query<AddressRow>(
      `SELECT TOP 1 ${COLS} FROM customer_addresses
       WHERE customer_id = @customerId AND is_deleted = 0 ORDER BY address_id DESC`,
      { customerId: [sql.Int, customerId] },
      exec,
    );
    return r.recordset[0] ?? null;
  },
};
