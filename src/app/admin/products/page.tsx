import Link from "next/link";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { formatCurrency } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const session = await requireSession();
  const products = await db.product.findMany({
    where: { tenantId: session.tenantId, isActive: true },
    include: { variants: { where: { isActive: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Products"
        description="Manage catalog and stock levels."
        action={<LinkButton href="/admin/products/new">New product</LinkButton>}
      />

      {products.length === 0 ? (
        <EmptyState message="No products yet. Create your first product to get started." />
      ) : (
        <Card className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Variants</th>
                <th className="px-4 py-3 font-medium">Total stock</th>
                <th className="px-4 py-3 font-medium">Price range</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const totalStock = product.variants.reduce((sum, v) => sum + v.quantityOnHand, 0);
                const prices = product.variants.map((v) => Number(v.price));
                const lowStock = product.variants.some((v) => v.quantityOnHand <= v.reorderThreshold);
                return (
                  <tr
                    key={product.id}
                    className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/products/${product.id}`}
                        className="font-medium text-zinc-900 hover:underline dark:text-zinc-50"
                      >
                        {product.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{product.variants.length}</td>
                    <td className={`px-4 py-3 font-mono ${lowStock ? "text-red-600" : "text-zinc-600 dark:text-zinc-400"}`}>
                      {totalStock}
                      {lowStock && <span className="ml-2 text-xs">low</span>}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {prices.length > 0
                        ? `${formatCurrency(Math.min(...prices))} – ${formatCurrency(Math.max(...prices))}`
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
