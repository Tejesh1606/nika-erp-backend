import { useState, useRef } from 'react';
import { UploadCloud, CheckCircle, AlertTriangle, RefreshCcw, X, FileText, Loader2 } from 'lucide-react';

export const UploadTab = ({ getToken, fetchHistory }: any) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Stores the final output (both successes and failures) for the dashboard
  const [results, setResults] = useState<any[]>([]); 
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesAdded = (newFiles: FileList | null) => {
    if (!newFiles) return;
    const fileArray = Array.from(newFiles);
    setFiles(prev => [...prev, ...fileArray]);
  };

  const removeFile = (indexToRemove: number) => {
    setFiles(files.filter((_, index) => index !== indexToRemove));
  };

  const processQueue = async () => {
    if (files.length === 0) return;
    
    setIsProcessing(true);
    setProgress(0);
    setResults([]);
    
    const finalResults = [];

    // The Dispatch Loop
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData(); 
      formData.append('file', file);
      
      try {
        // FIX 1: Fetch a fresh token INSIDE the loop so it never expires during a long batch
        const token = await getToken();
        
        const res = await fetch('https://ai-erp-api-gfmt.onrender.com/upload-invoice/', { 
          method: 'POST', 
          headers: { Authorization: `Bearer ${token}` },
          body: formData 
        });
        
        const result = await res.json();
        
        // FIX 2: Catch FastAPI's 'detail' keyword so errors actually display in the UI
        if (!res.ok) throw new Error(result.error || result.detail || `Server Error ${res.status}`);
        
        finalResults.push({ 
          fileName: file.name, 
          status: 'success', 
          data: result.data, 
          credits: result.credits_remaining 
        });
      } catch (e: any) { 
        finalResults.push({ 
          fileName: file.name, 
          status: 'error', 
          error: e.message 
        });
      }
      
      setProgress(i + 1);
    }

    setResults(finalResults);
    setIsProcessing(false);
    setFiles([]); 
    fetchHistory(); 
  };

  const resetUpload = () => {
    setResults([]);
    setFiles([]);
    setProgress(0);
  };

  return (
    <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-slate-200">
      <h2 className="text-2xl font-bold mb-6 text-center">Bulk AI Data Extraction</h2>
      
      {/* --- PHASE 3: RESULTS DASHBOARD --- */}
      {results.length > 0 ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-slate-50 rounded-xl p-6 border shadow-inner mb-6">
            <h3 className="font-bold text-lg text-slate-800 mb-4 border-b pb-2">Batch Processing Summary</h3>
            
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {results.map((res, idx) => (
                <div key={idx} className={`p-4 rounded-lg border flex flex-col ${res.status === 'success' ? 'bg-white border-slate-200' : 'bg-red-50 border-red-200'}`}>
                  
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-sm text-slate-700 flex items-center">
                      <FileText className="w-4 h-4 mr-2 text-slate-400" /> {res.fileName}
                    </span>
                    {res.status === 'success' ? 
                      <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded flex items-center"><CheckCircle className="w-3 h-3 mr-1"/> Success</span> : 
                      <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded flex items-center"><AlertTriangle className="w-3 h-3 mr-1"/> Failed</span>
                    }
                  </div>

                  {res.status === 'success' && (
                    <div className="text-xs text-slate-500 flex items-center gap-4 mt-1">
                      <span>Vendor: <strong className="text-slate-800">{res.data?.vendor?.name || 'Unknown'}</strong></span>
                      <span>Total: <strong className="text-blue-600 font-mono">${Number(res.data?.financials?.grand_total || 0).toFixed(2)}</strong></span>
                      <span>Confidence: <strong className={`${res.data?.ai_metadata?.confidence_score >= 85 ? 'text-green-600' : 'text-red-600'}`}>{res.data?.ai_metadata?.confidence_score || 0}%</strong></span>
                    </div>
                  )}

                  {res.status === 'error' && (
                    <div className="text-xs font-semibold text-red-600 mt-1">Error: {res.error}</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button onClick={resetUpload} className="w-full py-4 rounded-lg font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border transition-colors flex items-center justify-center">
            <RefreshCcw className="w-5 h-5 mr-2" /> Start New Batch
          </button>
        </div>

      ) : isProcessing ? (
        
        /* --- PHASE 2: PROCESSING QUEUE --- */
        <div className="py-12 text-center animate-in fade-in duration-300">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-800 mb-2">Processing Batch...</h3>
          <p className="text-slate-500 font-medium mb-6">File {progress} of {files.length}</p>
          
          <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden border">
            <div 
              className="bg-blue-600 h-4 transition-all duration-300 ease-out" 
              style={{ width: `${(progress / files.length) * 100}%` }}
            ></div>
          </div>
        </div>

      ) : (
        
        /* --- PHASE 1: UPLOAD ZONE --- */
        <div className="animate-in fade-in duration-300">
          <div 
            onClick={() => fileInputRef.current?.click()} 
            onDragOver={e => e.preventDefault()} 
            onDrop={e => {e.preventDefault(); handleFilesAdded(e.dataTransfer.files);}} 
            className="border-2 border-dashed border-slate-300 hover:bg-slate-50 p-12 text-center rounded-xl cursor-pointer transition-colors"
          >
            {/* Note the 'multiple' attribute here */}
            <input type="file" multiple className="hidden" ref={fileInputRef} onChange={e => handleFilesAdded(e.target.files)} />
            <UploadCloud className="w-12 h-12 mx-auto mb-4 text-blue-500" />
            <p className="font-semibold text-slate-700 text-lg">Drag & drop multiple invoices here</p>
            <p className="text-slate-400 text-sm mt-1">or click to browse files</p>
          </div>
          
          {/* Queued Files List */}
          {files.length > 0 && (
            <div className="mt-6 bg-slate-50 border rounded-lg p-4 max-h-64 overflow-y-auto">
              <h4 className="text-sm font-bold text-slate-600 uppercase mb-3 border-b pb-2">Queued Files ({files.length})</h4>
              <ul className="space-y-2">
                {files.map((file, idx) => (
                  <li key={idx} className="flex justify-between items-center bg-white p-2 border rounded shadow-sm text-sm">
                    <span className="font-medium text-slate-700 truncate mr-4"><FileText className="w-4 h-4 inline mr-2 text-slate-400"/>{file.name}</span>
                    <button onClick={() => removeFile(idx)} className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded"><X className="w-4 h-4" /></button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button 
            onClick={processQueue} 
            disabled={files.length === 0} 
            className={`w-full mt-6 py-4 rounded-lg font-bold text-white transition-all shadow-md ${files.length > 0 ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-300 cursor-not-allowed'}`}
          >
            Process {files.length > 0 ? `${files.length} Invoices` : 'Batch'}
          </button>
        </div>
      )}
    </div>
  );
};