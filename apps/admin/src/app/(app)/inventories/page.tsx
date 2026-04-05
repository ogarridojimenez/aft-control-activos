import Link from 'next/link';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export default async function InventoriesPage() {
  const supabase = createSupabaseAdmin();
  const { data: rows, error } = await supabase
    .from('inventories')
    .select('id, inventory_date, status, notes, areas(name, code)')
    .order('inventory_date', { ascending: false });

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        No se pudieron cargar inventarios: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-slate-900">Inventarios</h2>
        <Link
          href="/inventories/new"
          className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-500"
        >
          Nuevo inventario
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Área</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">ID</th>
            </tr>
          </thead>
          <tbody>
            {(!rows || rows.length === 0) && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                  No hay inventarios. Crea uno para usar en la app móvil.
                </td>
              </tr>
            )}
            {rows?.map((inv) => {
              const area = inv.areas as unknown as { name: string; code: string } | null;
              return (
                <tr key={inv.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-800">
                    <Link href={`/inventories/${inv.id}`} className="text-brand-600 hover:underline">
                      {inv.inventory_date}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {area ? `${area.name} (${area.code})` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{inv.id}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
