import { useState, useRef } from 'react';
import { UploadCloud } from 'lucide-react';

export const UploadTab = ({ getToken, fetchHistory }: any) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true); setError(null);
    const token = await getToken();
    const formData = new FormData(); 
    formData.append('file', file);
    
    try {
      const res = await fetch('https://ai-erp-api-gfmt.onrender.com/upload-invoice/', { 
        method: 'POST', 
        headers: { Authorization: `Bearer ${token}` },
        body: formData 
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      alert(`Success! You have ${result.credits_remaining} API credits left.`); 
      setFile(null); 
      fetchHistory();
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-slate-200">
      <h2 className="text-2xl font-bold mb-6 text-center">AI Data Extraction</h2>
      <div onClick={() => fileInputRef.current?.click()} onDragOver={e => e.preventDefault()} onDrop={e => {e.preventDefault(); if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0])}} className={`border-2 border-dashed p-12 text-center rounded-xl cursor-pointer transition-colors ${file ? 'border-green-500 bg-green-50' : 'border-slate-300 hover:bg-slate-50'}`}>
        <input type="file" className="hidden" ref={fileInputRef} onChange={e => e.target.files && setFile(e.target.files[0])} />
        <UploadCloud className={`w-12 h-12 mx-auto mb-4 ${file ? 'text-green-500' : 'text-blue-500'}`} />
        <p className="font-semibold text-slate-700">{file ? file.name : "Drag & drop invoice image here"}</p>
      </div>
      {error && <p className="text-red-500 mt-4 text-center font-semibold">{error}</p>}
      <button onClick={handleUpload} disabled={!file || loading} className={`w-full mt-6 py-4 rounded-lg font-bold text-white transition-all ${file && !loading ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-300'}`}>
        {loading ? "Processing via AI..." : "Process Invoice"}
      </button>
    </div>
  );
};