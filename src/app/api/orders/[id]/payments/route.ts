import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError, requireApiSession } from "@/lib/api";
import { PaymentMethod } from "@/generated/prisma/client";

const paymentSchema = z.object({
  method: z.enum(Object.values(PaymentMethod) as [string, ...string[]]),
  amount: z.number().positive(),
  reference: z.string().optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApiSession();
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = paymentSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Invalid payment");
  }

  const order = await db.order.findFirst({ where: { id, tenantId: session.tenantId } });
  if (!order) return apiError("Order not found", 404);
  if (order.status !== "pending") {
    return apiError(`Cannot record payment on a ${order.status} order`, 409);
  }

  const { method, amount, reference } = parsed.data;
  const [payment] = await db.$transaction([
    db.payment.create({
      data: {
        orderId: order.id,
        method: method as PaymentMethod,
        status: "completed",
        amount,
        reference,
      },
    }),
    db.order.update({ where: { id: order.id }, data: { status: "paid" } }),
  ]);

  return NextResponse.json({ payment }, { status: 201 });
}
