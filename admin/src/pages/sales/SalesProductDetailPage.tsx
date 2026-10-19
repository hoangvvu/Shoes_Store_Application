import { ProductDetailView } from '../../components/products/ProductDetailView';

export default function SalesProductDetailPage() {
  return <ProductDetailView basePath="/sales/products" canEdit={false} />;
}
