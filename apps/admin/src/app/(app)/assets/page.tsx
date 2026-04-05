import { createSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export default async function AssetsPage() {
  const supabase = createSupabaseAdmin();
  const { data: rows, error } = await supabase
    .from('assets')
    .select('asset_id, name, status, areas(code, name)')
    .order('asset_id', { ascending: true })
    .limit(200);

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        Error al cargar activos: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Activos</h2>
        <p className="mt-1 text-sm text-slate-600">Primeros 200 registros por ID de activo.</p>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">asset_id</th>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Área</th>
              <th className="px-4 py-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows?.map((a) => {
              const area = a.areas as unknown as { code: string; name: string } | null;
              return (
                <tr key={a.asset_id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-mono text-xs">{a.asset_id}</td>
                  <td className="px-4 py-3 text-slate-800">{a.name}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {area ? `${area.name} (${area.code})` : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{a.status}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
