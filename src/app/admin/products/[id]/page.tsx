import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { Card, PageHeader } from "@/components/ui";
import { AddVariantForm, VariantTable } from "@/components/variant-manager";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;

  const product = await db.product.findFirst({
    where: { id, tenantId: session.tenantId },
    include: { variants: { where: { isActive: true }, orderBy: { createdAt: "asc" } } },
  });

  if (!product) notFound();

  const variants = product.variants.map((v) => ({
    id: v.id,
    sku: v.sku,
    name: v.name,
    price: v.price.toString(),
    quantityOnHand: v.quantityOnHand,
    reorderThreshold: v.reorderThreshold,
  }));

  return (
    <div>
      <PageHeader title={product.name} description={product.description ?? undefined} />

      <Card className="p-0">
        <div className="p-4">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Variants</h2>
        </div>
        {variants.length > 0 && <VariantTable variants={variants} />}
        <div className="px-4 pb-4">
          <AddVariantForm productId={product.id} />
        </div>
      </Card>
    </div>
  );
}
