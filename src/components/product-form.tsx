"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewProductForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sku, setSku] = useState("");
  const [variantName, setVariantName] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("0");
  const [reorderThreshold, setReorderThreshold] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || undefined,
          initialVariant: sku
            ? {
                sku,
                name: variantName || "Default",
                price: Number(price || 0),
                quantityOnHand: Number(quantity || 0),
                reorderThreshold: Number(reorderThreshold || 0),
              }
            : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create product");
        return;
      }
      router.push(`/admin/products/${data.product.id}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950";
  const labelClass = "block text-sm font-medium text-zinc-700 dark:text-zinc-300";

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-6">
      <div className="space-y-4">
        <div>
          <label className={labelClass}>Product name</label>
          <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} rows={2} />
        </div>
      </div>

      <fieldset className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <legend className="px-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Initial variant (optional — you can add more later)
        </legend>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>SKU</label>
            <input value={sku} onChange={(e) => setSku(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Variant name</label>
            <input value={variantName} onChange={(e) => setVariantName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Price (USD)</label>
            <input type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Quantity on hand</label>
            <input type="number" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Reorder threshold</label>
            <input
              type="number"
              min="0"
              value={reorderThreshold}
              onChange={(e) => setReorderThreshold(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </fieldset>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
      >
        {loading ? "Creating..." : "Create product"}
      </button>
    </form>
  );
}
