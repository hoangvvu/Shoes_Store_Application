import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { AppError } from '../errors/AppError';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg']);

export const uploadController = {
  async uploadImage(req: Request, res: Response) {
    const { filename, data } = req.body ?? {};
    if (!filename || !data || typeof data !== 'string') {
      throw AppError.badRequest('Vui lòng chọn tệp hình ảnh hợp lệ (thiếu filename hoặc data)');
    }

    const rawExt = path.extname(filename).toLowerCase();
    const ext = rawExt && ALLOWED_EXTS.has(rawExt) ? rawExt : '.jpg';

    // Parse base64
    const base64Data = data.includes(';base64,') ? data.split(';base64,')[1] : data;
    const buffer = Buffer.from(base64Data, 'base64');

    // 5MB limit
    if (buffer.length > 5 * 1024 * 1024) {
      throw AppError.badRequest('Kích thước ảnh tối đa là 5MB');
    }

    const cleanBase = path.basename(filename, rawExt).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
    const uniqueName = `${Date.now()}-${cleanBase || 'image'}${ext}`;
    const filePath = path.join(UPLOAD_DIR, uniqueName);

    await fs.promises.writeFile(filePath, buffer);

    res.status(201).json({
      url: `/uploads/${uniqueName}`,
      filename: uniqueName,
      size: buffer.length,
    });
  },
};
