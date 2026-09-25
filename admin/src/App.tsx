import React, { useEffect, useState } from 'react';
import api from './services/api';

interface Product {
  id: string;
  name: string;
  basePrice: string;
  category: { name: string };
  brand: { name: string };
  variants: Array<{ size: string; color: string; stockQuantity: number }>;
}

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/products')
      .then((res: any) => {
        if (res.success) {
          setProducts(res.data.products);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: '32px', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: '24px', borderBottom: '1px solid #e5e7eb', paddingBottom: '16px' }}>
        <h1 style={{ color: '#111827', margin: 0 }}>📊 Shoes Store Management Dashboard</h1>
        <p style={{ color: '#6b7280', margin: '8px 0 0 0' }}>Quản lý Sản phẩm, Biến thể Size/Màu, Đơn hàng & Ma trận Phân quyền RBAC</p>
      </header>

      <section style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '20px' }}>
        <h2 style={{ fontSize: '18px', color: '#374151', marginBottom: '16px' }}>Danh sách Sản phẩm Giày ({products.length})</h2>
        {loading ? (
          <p>Đang tải dữ liệu từ Neon Serverless PostgreSQL...</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: '12px' }}>Tên Giày</th>
                <th style={{ padding: '12px' }}>Thương Hiệu</th>
                <th style={{ padding: '12px' }}>Danh Mục</th>
                <th style={{ padding: '12px' }}>Giá Cơ Sở</th>
                <th style={{ padding: '12px' }}>Biến Thể Size</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>{p.name}</td>
                  <td style={{ padding: '12px' }}>{p.brand?.name}</td>
                  <td style={{ padding: '12px' }}>{p.category?.name}</td>
                  <td style={{ padding: '12px', color: '#ef4444', fontWeight: 'bold' }}>
                    {Number(p.basePrice).toLocaleString('vi-VN')} đ
                  </td>
                  <td style={{ padding: '12px' }}>
                    {p.variants?.map((v) => (
                      <span
                        key={v.size}
                        style={{
                          display: 'inline-block',
                          backgroundColor: '#e0f2fe',
                          color: '#0369a1',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          marginRight: '4px',
                        }}
                      >
                        Size {v.size} ({v.stockQuantity})
                      </span>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
