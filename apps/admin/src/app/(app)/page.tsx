import { createSupabaseAdmin } from '@/lib/supabase/admin';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const supabase = createSupabaseAdmin();
  const [assets, inventories, areas] = await Promise.all([
    supabase.from('assets').select('id', { count: 'exact', head: true }),
    supabase.from('inventories').select('id', { count: 'exact', head: true }),
    supabase.from('areas').select('id', { count: 'exact', head: true }),
  ]);

  const counts = {
    assets: assets.count ?? 0,
    inventories: inventories.count ?? 0,
    areas: areas.count ?? 0,
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <p className="text-sm uppercase tracking-wide text-slate-500">Resumen</p>
        <h2 className="mt-1 text-2xl font-semibold text-slate-900">Panel AFT</h2>
        <p className="mt-2 max-w-2xl text-slate-600">
          Carga masiva de activos, preparación de inventarios y conciliación con la app móvil offline.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Áreas" value={counts.areas} />
        <StatCard title="Activos" value={counts.assets} />
        <StatCard title="Inventarios" value={counts.inventories} />
      </div>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/upload"
          className="inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-brand-500"
        >
          Subir Excel
        </Link>
        <Link
          href="/inventories/new"
          className="inline-flex rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          Nuevo inventario
        </Link>
      </div>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-900">{value}</p>
    </div>
  );
}
