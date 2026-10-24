import { ProductDetailView } from '../../components/products/ProductDetailView';

export default function AdminProductDetailPage() {
  return <ProductDetailView basePath="/admin/products" canEdit={true} />;
}
