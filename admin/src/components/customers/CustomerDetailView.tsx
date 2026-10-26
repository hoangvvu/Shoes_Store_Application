import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { customerService } from '../../services/customer.service';
import type { CustomerDetail } from '../../types/customer';
import { getErrorMessage } from '../../utils/error';
import { genderText } from '../../utils/person';
import { ADDRESS_LABEL, ORDER_STATUS_LABEL, formatDateTime, formatVnd, joinAddress } from '../../utils/format';
import { PageHeader } from '../common/PageHeader';
import { CustomerFormModal } from './CustomerFormModal';

interface Props {
  basePath: string;
  canDelete: boolean;
}

export function CustomerDetailView({ basePath, canDelete }: Props) {
  const { id } = useParams();
  const customerId = Number(id);
  const navigate = useNavigate();
  const [data, setData] = useState<CustomerDetail | null>(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      setData(await customerService.get(customerId));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [customerId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function remove() {
    if (!data || !window.confirm(`Xóa mềm khách "${data.fullName}"?`)) return;
    try {
      await customerService.remove(data.customerId);
      navigate(basePath, { replace: true });
    } catch (err) {
      window.alert(getErrorMessage(err));
    }
  }

  if (error) {
    return (
      <>
        <p className="form-error">{error}</p>
        <Link to={basePath} className="link">← Quay lại danh sách</Link>
      </>
    );
  }
  if (!data) return <p className="muted">Đang tải…</p>;

  return (
    <>
      <PageHeader
        title={data.fullName}
        actions={
          <>
            <Link to={basePath} className="btn btn--ghost">Danh sách</Link>
            <button className="btn btn--primary" onClick={() => setEditing(true)}>Sửa thông tin</button>
            {canDelete && <button className="btn btn--danger" onClick={remove}>Xóa mềm</button>}
          </>
        }
      />

      <div className="grid-2">
        <section className="card">
          <h3>Thông tin</h3>
          <dl className="kv">
            <dt>Họ</dt><dd>{data.lastName}</dd>
            <dt>Tên</dt><dd>{data.firstName}</dd>
            <dt>Số điện thoại</dt><dd>{data.phone ?? '—'}</dd>
            <dt>Email</dt><dd>{data.email ?? '—'}</dd>
            <dt>Giới tính</dt><dd>{genderText(data.gender)}</dd>
            <dt>Ngày sinh</dt><dd>{data.dateOfBirth ? data.dateOfBirth.slice(0, 10).split('-').reverse().join('/') : '—'}</dd>
            <dt>Tài khoản</dt><dd>{data.hasAccount ? 'Có tài khoản (app/web)' : 'Khách tại quầy, chưa có tài khoản'}</dd>
            <dt>Tổng tiền đã mua</dt><dd><strong>{formatVnd(data.totalPurchased)}</strong></dd>
          </dl>
        </section>

        <section className="card">
          <h3>Địa chỉ giao hàng ({data.addresses.length})</h3>
          {data.addresses.length === 0 && <p className="muted">Chưa có địa chỉ.</p>}
          <ul className="addr-list">
            {data.addresses.map((a) => (
              <li key={a.addressId}>
                <div>
                  <span className="badge badge--muted">{ADDRESS_LABEL[a.label]}</span>
                  {a.isDefault && <span className="badge badge--ok">Mặc định</span>}
                </div>
                <strong>{a.receiverName}</strong> · {a.receiverPhone}
                <div className="muted">{joinAddress(a)}</div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card">
        <h3>Đơn hàng gần đây</h3>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Mã đơn</th><th>Ngày</th><th>Kênh</th><th>Trạng thái</th><th className="num">Phải trả</th></tr>
            </thead>
            <tbody>
              {data.recentOrders.length === 0 && <tr><td colSpan={5} className="muted center">Chưa có đơn hàng</td></tr>}
              {data.recentOrders.map((o) => (
                <tr key={o.invoiceId}>
                  <td>#{o.invoiceId}</td>
                  <td>{formatDateTime(o.invoiceDate)}</td>
                  <td>{o.channel === 'POS' ? 'Tại quầy' : 'Online'}</td>
                  <td>{ORDER_STATUS_LABEL[o.orderStatus] ?? o.orderStatus}</td>
                  <td className="num">{formatVnd(o.amountPayable)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {editing && (
        <CustomerFormModal
          customer={data}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            void load();
          }}
        />
      )}
    </>
  );
}
