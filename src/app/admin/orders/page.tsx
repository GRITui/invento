import Link from "next/link";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { Card, EmptyState, LinkButton, PageHeader, StatusBadge } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const session = await requireSession();
  const orders = await db.order.findMany({
    where: { tenantId: session.tenantId },
    include: { lines: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Staff-entered orders and fulfillment status."
        action={<LinkButton href="/admin/orders/new">New order</LinkButton>}
      />

      {orders.length === 0 ? (
        <EmptyState message="No orders yet." />
      ) : (
        <Card className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const total = order.lines.reduce((sum, l) => sum + Number(l.unitPrice) * l.quantity, 0);
                return (
                  <tr key={order.id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="font-medium text-zinc-900 hover:underline dark:text-zinc-50"
                      >
                        #{order.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{order.customerName ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-zinc-600 dark:text-zinc-400">{formatCurrency(total)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3 text-zinc-500">{formatDate(order.createdAt)}</td>
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
