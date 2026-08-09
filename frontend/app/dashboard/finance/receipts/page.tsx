'use client';

import { useEffect, useState, useRef } from 'react';
import { api, downloadUrl } from '@/lib/api';
import { formatETB, monthLabel, formatEthiopianDateFromGregorian } from '@/lib/ethiopian-calendar';
import { Topbar } from '@/components/layout/Topbar';
import { Image } from 'lucide-react';

const IMG_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface ReceiptRow {
  id: string;
  receiptNumber: string;
  monthsPaid: string[];
  amount: number;
  paymentDate: string;
  student: { fullName: string };
  issuedBy: { fullName: string };
}

interface PhotoRow {
  id: string;
  filename: string;
  note: string | null;
  createdAt: string;
}

export default function ReceiptsPage() {
  const [rows, setRows] = useState<ReceiptRow[]>([]);
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function fetchAll() {
    Promise.all([
      api.get<ReceiptRow[]>('/finance/receipts'),
      api.get<PhotoRow[]>('/finance/receipts-photos'),
    ]).then(([r, p]) => { setRows(r); setPhotos(p); }).finally(() => setLoading(false));
  }

  useEffect(() => { fetchAll(); }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f && ['image/png', 'image/jpeg'].includes(f.type)) setFile(f);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('photo', file);
    if (note.trim()) fd.append('note', note.trim());
    try {
      const token = localStorage.getItem('mh_token');
      await fetch(`${IMG_BASE}/api/v1/finance/receipts-photos`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      setFile(null);
      setNote('');
      fetchAll();
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <Topbar title="Receipts" subtitle="Printable receipts and uploaded receipt photos" />

      {/* Upload section */}
      <div className="card p-6 mb-6">
        <h2 className="text-sm font-semibold text-ink mb-4">Upload Receipt Photo</h2>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${dragOver ? 'border-gold bg-gold/5' : 'border-gray-300 hover:border-gold/50'}`}
        >
          <input ref={fileRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleFileInput} />
          {file ? (
            <div className="flex flex-col items-center gap-2">
              <img src={URL.createObjectURL(file)} alt="preview" className="max-h-48 rounded" />
              <p className="text-sm text-ink">{file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-slate">
              <Image size={36} />
              <p className="text-sm">Drag & drop a PNG or JPG here, or click to browse</p>
              <p className="text-xs">Max 5 MB</p>
            </div>
          )}
        </div>
        <input
          className="input mt-3"
          placeholder="Add a note about this receipt photo…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button className="btn-gold mt-3" disabled={!file || uploading} onClick={handleUpload}>
          {uploading ? 'Uploading…' : 'Upload Photo'}
        </button>
      </div>

      {/* Photo gallery */}
      {photos.length > 0 && (
        <div className="card p-6 mb-6">
          <h2 className="text-sm font-semibold text-ink mb-4">Saved Receipt Photos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {photos.map((p) => (
              <div key={p.id} className="border border-gray-100 rounded-lg overflow-hidden">
                <a href={`${IMG_BASE}/uploads/receipts/${p.filename}`} target="_blank" rel="noreferrer">
                  <img src={`${IMG_BASE}/uploads/receipts/${p.filename}`} alt="receipt" className="w-full h-48 object-cover" />
                </a>
                {p.note && (
                  <div className="p-3">
                    <p className="text-sm text-ink">{p.note}</p>
                    <p className="text-xs text-slate mt-1">{formatEthiopianDateFromGregorian(new Date(p.createdAt))}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Receipts table */}
      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Receipt No</th><th>Student</th><th className="hidden sm:table-cell">Months</th><th>Amount</th><th className="hidden sm:table-cell">Date</th><th className="hidden lg:table-cell">Issued By</th><th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="font-mono text-xs">{r.receiptNumber}</td>
                <td className="font-medium text-ink">{r.student.fullName}</td>
                <td className="hidden sm:table-cell">{r.monthsPaid.map(monthLabel).join(', ')}</td>
                <td>{formatETB(Number(r.amount))}</td>
                <td className="hidden sm:table-cell">{formatEthiopianDateFromGregorian(new Date(r.paymentDate))}</td>
                <td className="hidden lg:table-cell">{r.issuedBy.fullName}</td>
                <td>
                  <a className="text-xs text-gold font-medium hover:underline" href={downloadUrl(`/finance/receipts/${r.id}/print`)} target="_blank" rel="noreferrer">Print</a>
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={7} className="text-center text-sm text-slate py-8">No receipts yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
