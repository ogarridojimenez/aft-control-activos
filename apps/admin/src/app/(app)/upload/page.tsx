'use client';

import { useEffect, useState } from 'react';

type Area = { id: string; name: string; code: string };

export default function UploadPage() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [areaId, setAreaId] = useState('');
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [details, setDetails] = useState<unknown>(null);

  useEffect(() => {
    fetch('/api/areas', { credentials: 'include' })
      .then((r) => r.json())
      .then((j) => {
        const list = (j.areas ?? []) as Area[];
        setAreas(list);
        if (list[0]) setAreaId(list[0].id);
      })
      .catch(() => setMessage('No se pudieron cargar las áreas'));
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.elements.namedItem('file') as HTMLInputElement;
    const f = input.files?.[0];
    const selectedArea = areas.find((a) => a.id === areaId);
    if (!f || !selectedArea) {
      setStatus('error');
      setMessage('Selecciona archivo y área.');
      return;
    }

    setStatus('uploading');
    setMessage(null);
    setDetails(null);

    try {
      const body = new FormData();
      body.set('file', f);
      body.set('areaCode', selectedArea.code);
      const res = await fetch('/api/upload', { method: 'POST', body, credentials: 'include' });
      const json = await res.json();
      if (!res.ok) {
        setStatus('error');
        setMessage(json.error ?? 'Error al procesar');
        setDetails(json.details ?? null);
        return;
      }
      setStatus('done');
      setMessage(`Área: ${selectedArea.name}. Procesados: ${json.processed}. Errores de fila: ${json.errorCount ?? 0}.`);
      setDetails(json.errors ?? []);
    } catch {
      setStatus('error');
      setMessage('Fallo de red o servidor.');
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Carga masiva por área</h2>
        <p className="mt-1 text-sm text-slate-600">
          Cada archivo Excel pertenece a un área. Selecciona el área y sube el archivo.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <label className="text-sm font-medium text-slate-700" htmlFor="area">
            Área del inventario
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
        <div>
          <label className="text-sm font-medium text-slate-700" htmlFor="file">
            Archivo Excel del área
          </label>
          <input
            id="file"
            name="file"
            type="file"
            accept=".xlsx,.xls"
            className="mt-1 block w-full text-sm"
            required
          />
        </div>
        <button
          type="submit"
          disabled={status === 'uploading' || !areaId}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-60"
        >
          {status === 'uploading' ? 'Procesando…' : 'Subir y validar'}
        </button>
      </form>

      {message && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            status === 'error'
              ? 'border-red-200 bg-red-50 text-red-800'
              : 'border-emerald-200 bg-emerald-50 text-emerald-900'
          }`}
        >
          {message}
        </div>
      )}

      {Array.isArray(details) && details.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
          <p className="font-medium">Primeros errores de validación por fila</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            {(details as { row: number; message: string }[]).map((d, i) => (
              <li key={i}>
                Fila {d.row}: {d.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
