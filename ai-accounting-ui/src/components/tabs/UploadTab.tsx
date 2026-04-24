import { useState, useRef } from 'react';
import { UploadCloud, CheckCircle, AlertTriangle, RefreshCcw } from 'lucide-react';

export const UploadTab = ({ getToken, fetchHistory }: any) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // --- NEW STATE: Store the AI's response data ---
  const [successData, setSuccessData] = useState<any>(null); 
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true); 
    setError(null); 
    setSuccessData(null); // Clear previous results

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
      
      // Save the structured data and metadata instead of using an alert
      setSuccessData({
        parsedData: result.data,
        credits: result.credits_remaining
      }); 
      
      setFile(null); 
      fetchHistory();
    } catch (e: any) { 
      setError(e.message); 
    } finally { 
      setLoading(false); 
    }
  };

  const resetUpload = () => {
    setSuccessData(null);
    setFile(null);
    setError(null);
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-slate-200">
      <h2 className="text-2xl font-bold mb-6 text-center">AI Data Extraction</h2>
      
      {/* --- SUCCESS DASHBOARD --- */}
      {successData ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center mb-6">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-green-900 mb-2">Extraction Complete</h3>
            <p className="text-green-700 font-medium">Data committed to ledger. {successData.credits} API credits remaining.</p>
          </div>

          <div className="bg-slate-50 rounded-xl p-6 border shadow-inner mb-6">
            <h4 className="font-bold text-slate-800 mb-4 border-b pb-2">AI Extraction Summary</h4>
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div>
                <p className="text-slate-500 font-bold uppercase text-xs">Vendor</p>
                <p className="font-semibold text-slate-900">{successData.parsedData?.vendor?.name || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-slate-500 font-bold uppercase text-xs">Grand Total</p>
                <p className="font-mono font-bold text-blue-600">${Number(successData.parsedData?.financials?.grand_total || 0).toFixed(2)}</p>
              </div>
            </div>

            {/* Confidence Score Visualizer */}
            <div className="mt-4 p-4 rounded-lg bg-white border flex items-center justify-between">
              <div>
                <p className="text-slate-500 font-bold uppercase text-xs mb-1">AI Confidence Score</p>
                <div className="flex items-center">
                  <div className="w-32 bg-slate-200 rounded-full h-2.5 mr-3">
                    <div 
                      className={`h-2.5 rounded-full ${successData.parsedData?.ai_metadata?.confidence_score >= 85 ? 'bg-green-500' : 'bg-red-500'}`} 
                      style={{ width: `${successData.parsedData?.ai_metadata?.confidence_score || 0}%` }}
                    ></div>
                  </div>
                  <span className="font-bold text-slate-700">{successData.parsedData?.ai_metadata?.confidence_score || 0}%</span>
                </div>
              </div>
              
              {successData.parsedData?.ai_metadata?.confidence_score < 85 && (
                <div className="flex items-center text-red-600 text-xs font-bold bg-red-50 px-2 py-1 rounded">
                  <AlertTriangle className="w-4 h-4 mr-1" /> Needs Review
                </div>
              )}
            </div>
            
            {successData.parsedData?.ai_metadata?.image_quality_warning && (
              <p className="text-xs text-amber-600 font-bold mt-3 flex items-center">
                <AlertTriangle className="w-4 h-4 mr-1" /> AI reported poor image quality. Verify line items carefully.
              </p>
            )}
          </div>

          <button onClick={resetUpload} className="w-full py-4 rounded-lg font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border transition-colors flex items-center justify-center">
            <RefreshCcw className="w-5 h-5 mr-2" /> Upload Another Invoice
          </button>
        </div>
      ) : (
        /* --- STANDARD UPLOAD UI --- */
        <div className="animate-in fade-in duration-300">
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
      )}
    </div>
  );
};