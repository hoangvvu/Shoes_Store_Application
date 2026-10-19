import { ProductManager } from '../../components/products/ProductManager';

export default function SalesProductsPage() {
  return <ProductManager basePath="/sales/products" canEdit={false} />;
}
