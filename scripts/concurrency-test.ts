import "dotenv/config";
import { testDb as db, cleanupTenant } from "./db-test-client";
import { applyStockMovement, InsufficientStockError } from "@/lib/inventory";

/**
 * Verifies the row-locking (`SELECT ... FOR UPDATE`) in lib/inventory.ts
 * actually serializes concurrent decrements instead of racing — the
 * hardening requirement called out in the handoff (Section 3, step 8):
 * "Concurrency tests for stock decrement under simultaneous order entry."
 *
 * Starts a variant at 5 units on hand, fires 10 concurrent decrement-by-1
 * transactions at it, and asserts exactly 5 succeed (the other 5 correctly
 * fail with InsufficientStockError) — i.e. the variant never oversells and
 * never goes negative, even under real concurrent writers.
 *
 * Run with: DATABASE_URL=<local-or-throwaway-db> npx tsx scripts/concurrency-test.ts
 */

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const STARTING_STOCK = 5;
const CONCURRENT_ORDERS = 10;

async function main() {
  const run = `concurrency-${Date.now()}`;

  const tenant = await db.tenant.create({ data: { name: `Concurrency Test ${run}`, slug: run } });
  const store = await db.store.create({ data: { tenantId: tenant.id, name: "Main Store" } });
  const product = await db.product.create({ data: { tenantId: tenant.id, name: "Contested Widget" } });
  const variant = await db.variant.create({
    data: {
      tenantId: tenant.id,
      productId: product.id,
      sku: `CONTESTED-${run}`,
      name: "Standard",
      price: 4.5,
      quantityOnHand: STARTING_STOCK,
      reorderThreshold: 0,
    },
  });
  console.log(`✓ variant starts at ${STARTING_STOCK} units on hand`);
  console.log(`Firing ${CONCURRENT_ORDERS} concurrent decrement-by-1 transactions...`);

  const attempts = Array.from({ length: CONCURRENT_ORDERS }, (_, i) =>
    db
      .$transaction((tx) =>
        applyStockMovement(tx, {
          tenantId: tenant.id,
          storeId: store.id,
          variantId: variant.id,
          delta: -1,
          reason: "order_fulfillment",
          note: `concurrency test attempt ${i}`,
        })
      )
      .then(() => ({ ok: true as const }))
      .catch((err) => ({ ok: false as const, err }))
  );

  const results = await Promise.all(attempts);
  const succeeded = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);
  const insufficientStockFailures = failed.filter(
    (r) => !r.ok && r.err instanceof InsufficientStockError
  );

  assert(succeeded.length === STARTING_STOCK, `expected exactly ${STARTING_STOCK} successes, got ${succeeded.length}`);
  assert(failed.length === CONCURRENT_ORDERS - STARTING_STOCK, `expected ${CONCURRENT_ORDERS - STARTING_STOCK} failures, got ${failed.length}`);
  assert(
    insufficientStockFailures.length === failed.length,
    "every failure should be InsufficientStockError, not some other error (e.g. a race condition corrupting state)"
  );
  console.log(`✓ exactly ${succeeded.length} succeeded, ${failed.length} correctly rejected as insufficient stock`);

  const final = await db.variant.findUniqueOrThrow({ where: { id: variant.id } });
  assert(final.quantityOnHand === 0, `expected final stock 0, got ${final.quantityOnHand}`);
  assert(final.quantityOnHand >= 0, "stock must never go negative");
  console.log("✓ final stock is exactly 0 — no oversell, no negative stock, no lost updates");

  const movementCount = await db.stockMovement.count({ where: { variantId: variant.id } });
  assert(movementCount === STARTING_STOCK, `expected ${STARTING_STOCK} audit rows, got ${movementCount}`);
  console.log(`✓ exactly ${STARTING_STOCK} StockMovement audit rows written (one per successful decrement)`);

  await cleanupTenant(tenant.id);
  console.log("\nConcurrency hardening test passed.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
