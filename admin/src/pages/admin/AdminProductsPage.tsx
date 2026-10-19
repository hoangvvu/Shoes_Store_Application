import { ProductManager } from '../../components/products/ProductManager';

export default function AdminProductsPage() {
  return <ProductManager basePath="/admin/products" canEdit={true} />;
}
