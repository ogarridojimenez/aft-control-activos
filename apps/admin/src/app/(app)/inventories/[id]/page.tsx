'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

type InventoryDetail = {
  id: string;
  areaId: string;
  inventoryDate: string;
  status: string;
  notes: string | null;
  areaName: string;
  areaCode: string;
};

type InventoryItem = {
  id: string;
  assetId: string;
  assetTag: string;
  assetName: string;
  assetCategory: string | null;
  assetLocation: string | null;
  quantityExpected: number;
  quantityFound: number;
  conditionNotes: string | null;
  scannedAt: string | null;
};

type Reconciliation = {
  id: string;
  missingAssets: any[];
  surplusAssets: any[];
  summary: any;
  status: string;
  notes: string | null;
};

type Stats = {
  expected: number;
  found: number;
  missing: number;
  accuracy: number;
};

type ResponseData = {
  inventory: InventoryDetail;
  items: InventoryItem[];
  reconciliation: Reconciliation | null;
  stats: Stats;
};

export default function InventoryDetailPage() {
  const params = useParams();
  const inventoryId = params.id as string;

  const [data, setData] = useState<ResponseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'found' | 'missing'>('all');

  useEffect(() => {
    fetch(`/api/inventories/${inventoryId}/reconciliation`, { credentials: 'include' })
      .then((r) => {
        if (!r.ok) throw new Error('No se pudo cargar el inventario');
        return r.json();
      })
      .then((j) => {
        setData(j);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [inventoryId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-slate-500">Cargando inventario…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        {error ?? 'No se encontraron datos'}
      </div>
    );
  }

  const { inventory, items, reconciliation, stats } = data;

  const filteredItems = items.filter((item) => {
    if (filter === 'found') return (item.quantityFound ?? 0) > 0;
    if (filter === 'missing') return (item.quantityFound ?? 0) === 0;
    return true;
  });

  const missingFromRecon = reconciliation?.missingAssets ?? [];
  const surplusFromRecon = reconciliation?.surplusAssets ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/inventories" className="text-sm text-slate-500 hover:text-slate-700">
            ← Volver a inventarios
          </Link>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">
            Inventario — {inventory.areaName}
          </h2>
          <p className="text-sm text-slate-600">
            {inventory.inventoryDate} · {inventory.areaCode} ·{' '}
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
              {inventory.status}
            </span>
          </p>
        </div>
        {reconciliation && (
          <div className="flex gap-2">
            <button
              onClick={() => window.open(`/api/inventories/${inventoryId}/report?format=pdf`, '_blank')}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Descargar PDF
            </button>
            <button
              onClick={() => window.open(`/api/inventories/${inventoryId}/report?format=excel`, '_blank')}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Descargar Excel
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Esperados" value={stats.expected} color="slate" />
        <StatCard label="Encontrados" value={stats.found} color="emerald" />
        <StatCard label="Faltantes" value={stats.missing} color="red" />
        <StatCard label="Exactitud" value={`${stats.accuracy}%`} color="blue" />
      </div>

      {inventory.notes && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <span className="font-medium">Notas:</span> {inventory.notes}
        </div>
      )}

      {/* Surplus */}
      {surplusFromRecon.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h3 className="text-sm font-semibold text-amber-900">
            Sobrantes ({surplusFromRecon.length})
          </h3>
          <p className="mt-1 text-xs text-amber-700">
            Activos encontrados que no estaban en el listado del área
          </p>
          <ul className="mt-2 space-y-1">
            {surplusFromRecon.map((s: any, i: number) => (
              <li key={i} className="text-xs text-amber-800">
                <span className="font-mono">{s.asset_id}</span> — {s.notes}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Items table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h3 className="text-sm font-medium text-slate-900">Detalle de conteo</h3>
          <div className="flex gap-1">
            {(['all', 'found', 'missing'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-md px-3 py-1 text-xs font-medium ${
                  filter === f
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f === 'all' ? `Todos (${items.length})` : f === 'found' ? `Encontrados (${stats.found})` : `Faltantes (${stats.missing})`}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Asset ID</th>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Categoría</th>
                <th className="px-4 py-3 font-medium">Ubicación</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Escaneado</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-500">
                    No hay items que mostrar
                  </td>
                </tr>
              )}
              {filteredItems.map((item) => {
                const isFound = (item.quantityFound ?? 0) > 0;
                return (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-mono text-xs">{item.assetTag}</td>
                    <td className="px-4 py-3 text-slate-800">{item.assetName}</td>
                    <td className="px-4 py-3 text-slate-600">{item.assetCategory ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{item.assetLocation ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          isFound
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {isFound ? 'Encontrado' : 'Faltante'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {item.scannedAt
                        ? new Date(item.scannedAt).toLocaleString('es')
                        : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reconciliation notes */}
      {reconciliation?.notes && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <span className="font-medium">Notas de conciliación:</span> {reconciliation.notes}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: 'slate' | 'emerald' | 'red' | 'blue';
}) {
  const colors = {
    slate: 'border-slate-200 bg-white',
    emerald: 'border-emerald-200 bg-emerald-50',
    red: 'border-red-200 bg-red-50',
    blue: 'border-blue-200 bg-blue-50',
  };
  const textColors = {
    slate: 'text-slate-900',
    emerald: 'text-emerald-900',
    red: 'text-red-900',
    blue: 'text-blue-900',
  };

  return (
    <div className={`rounded-xl border p-4 shadow-sm ${colors[color]}`}>
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${textColors[color]}`}>{value}</p>
    </div>
  );
}
