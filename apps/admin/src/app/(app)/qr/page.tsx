'use client';

import { useEffect, useState } from 'react';

type Area = { id: string; name: string; code: string };

export default function QRPage() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [areaId, setAreaId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assetCount, setAssetCount] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/areas', { credentials: 'include' })
      .then((r) => r.json())
      .then((j) => {
        const list = (j.areas ?? []) as Area[];
        setAreas(list);
        if (list[0]) setAreaId(list[0].id);
      })
      .catch(() => setError('No se pudieron cargar las áreas'));
  }, []);

  async function onGenerate() {
    if (!areaId) return;
    setLoading(true);
    setError(null);
    setAssetCount(null);

    try {
      const res = await fetch('/api/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ areaId }),
      });

      if (!res.ok) {
        const json = await res.json();
        setError(json.error ?? 'Error al generar PDF');
        setLoading(false);
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const area = areas.find((a) => a.id === areaId);
      a.download = `qr_${area?.code}_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setAssetCount(blob.size);
    } catch {
      setError('Error de red');
    }
    setLoading(false);
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Generar códigos QR</h2>
        <p className="mt-1 text-sm text-slate-600">
          Selecciona un área para generar un PDF con los códigos QR de todos sus activos.
          Imprime y pega los QR en cada activo antes del inventario.
        </p>
      </div>

      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <label className="text-sm font-medium text-slate-700" htmlFor="area">
            Área
          </label>
          <select
            id="area"
            value={areaId}
            onChange={(e) => setAreaId(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            required
          >
            <option value="">Selecciona un área</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.code})
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={onGenerate}
          disabled={loading || !areaId}
          className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-60"
        >
          {loading ? 'Generando PDF…' : 'Generar QR en PDF'}
        </button>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {assetCount !== null && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            PDF generado correctamente ({(assetCount / 1024).toFixed(1)} KB). Revisa tus descargas.
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-medium text-slate-900">Formato del PDF</h3>
        <ul className="mt-2 space-y-1 text-sm text-slate-600">
          <li>• 3 columnas × 5 filas por página (15 QR por hoja)</li>
          <li>• Cada QR contiene el ID del activo (ej: MB00001)</li>
          <li>• Incluye nombre del activo y ubicación</li>
          <li>• Listo para imprimir y recortar</li>
        </ul>
      </div>
    </div>
  );
}
