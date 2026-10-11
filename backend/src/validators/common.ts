import { z } from 'zod';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../constants/auth.constant';
import { ageOf, isFutureDate } from '../utils/age';

export const MIN_EMPLOYEE_AGE = 18;

/**
 * M1 #12 – Username: 4–50 ký tự; chỉ chữ cái (a–z, A–Z), số, dấu gạch dưới hoặc gạch ngang; không có khoảng trắng.
 * (Không .trim(): khoảng trắng đầu/cuối cũng bị từ chối thay vì bị tự cắt.)
 */
export const usernameField = z
  .string({ required_error: 'Vui lòng nhập tên đăng nhập' })
  .min(4, 'Tên đăng nhập tối thiểu 4 ký tự')
  .max(50, 'Tên đăng nhập tối đa 50 ký tự')
  .regex(/^[A-Za-z0-9_-]+$/, 'Tên đăng nhập chỉ gồm chữ cái, số, dấu gạch dưới (_) hoặc gạch ngang (-), không có khoảng trắng');

/** M1 #12 – Mật khẩu: tối thiểu 8 ký tự gồm chữ hoa, chữ thường và số (tối đa 72 vì giới hạn của bcrypt). */
export const passwordField = z
  .string({ required_error: 'Vui lòng nhập mật khẩu' })
  .min(PASSWORD_MIN_LENGTH, `Mật khẩu tối thiểu ${PASSWORD_MIN_LENGTH} ký tự`)
  .max(PASSWORD_MAX_LENGTH, `Mật khẩu tối đa ${PASSWORD_MAX_LENGTH} ký tự`)
  .refine((v) => /[A-Z]/.test(v), 'Mật khẩu phải có ít nhất 1 chữ hoa')
  .refine((v) => /[a-z]/.test(v), 'Mật khẩu phải có ít nhất 1 chữ thường')
  .refine((v) => /\d/.test(v), 'Mật khẩu phải có ít nhất 1 chữ số');

export const phoneField = z
  .string({ required_error: 'Vui lòng nhập số điện thoại' })
  .trim()
  .regex(/^(0|\+84)\d{9}$/, 'Số điện thoại không hợp lệ');

/** M3 #7 – SĐT nhân viên: 10–11 chữ số, bắt đầu bằng số 0. Việc "không trùng nhân viên khác" kiểm ở service. */
export const employeePhoneField = z
  .string({ required_error: 'Vui lòng nhập số điện thoại' })
  .trim()
  .regex(/^0\d{9,10}$/, 'Số điện thoại phải gồm 10–11 chữ số và bắt đầu bằng số 0');

/** M3 #7 – Ngày sinh nhân viên: hợp lệ, không ở tương lai và đủ 18 tuổi trở lên tính đến hôm nay. */
export const adultBirthDateField = z
  .string({ invalid_type_error: 'Ngày sinh không hợp lệ', required_error: 'Vui lòng nhập ngày sinh' })
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày sinh phải theo định dạng YYYY-MM-DD')
  .transform((v, ctx) => {
    const d = new Date(`${v}T00:00:00.000Z`);
    if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Ngày sinh không hợp lệ' }); // vd. 2000-02-31
      return z.NEVER;
    }
    return d;
  })
  .superRefine((d, ctx) => {
    if (!(d instanceof Date)) return; // ngày không tồn tại đã bị báo lỗi ở bước transform
    if (isFutureDate(d)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Ngày sinh không được ở tương lai' });
    else if (ageOf(d) < MIN_EMPLOYEE_AGE) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Nhân viên phải đủ ${MIN_EMPLOYEE_AGE} tuổi trở lên` });
    else if (ageOf(d) > 100) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Ngày sinh không hợp lệ' });
  });

export const fullNameField = z
  .string({ required_error: 'Vui lòng nhập họ tên' })
  .trim()
  .min(2, 'Họ tên tối thiểu 2 ký tự')
  .max(100, 'Họ tên tối đa 100 ký tự');

export const idParam = z.object({
  id: z.coerce.number({ invalid_type_error: 'Mã không hợp lệ' }).int().positive('Mã không hợp lệ'),
});
