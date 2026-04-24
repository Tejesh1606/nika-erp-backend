import { useState, useEffect } from 'react';
import { CreditCard, Key, Database, RefreshCcw } from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';

export const SettingsTab = () => {
  const { getToken } = useAuth();
  const [workspace, setWorkspace] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkspace = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch('https://ai-erp-api-gfmt.onrender.com/workspace/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch workspace');
      setWorkspace(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspace();
  }, []);

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-2xl font-bold mb-6 text-slate-800">Organization Settings</h2>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200 mb-6 font-semibold">
          Error: {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* --- BILLING & USAGE CARD --- */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6 border-b pb-4">
            <h3 className="text-lg font-bold flex items-center text-slate-800">
              <Database className="w-5 h-5 mr-2 text-blue-600" /> API Usage & Billing
            </h3>
            <button onClick={fetchWorkspace} className="text-slate-400 hover:text-blue-600 transition-colors">
              <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          </div>

          <div className="mb-6">
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Current Balance</p>
            {loading ? (
              <div className="h-10 bg-slate-100 rounded animate-pulse w-1/2"></div>
            ) : (
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-extrabold text-slate-900">{workspace?.api_credits || 0}</span>
                <span className="text-lg font-bold text-slate-400">Credits</span>
              </div>
            )}
            <p className="text-sm text-slate-500 mt-2 font-medium">
              Estimated Value: <span className="text-slate-800 font-bold">{workspace?.dollar_value || '$0.00'}</span> USD
            </p>
          </div>

          <button className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold transition-colors flex items-center justify-center">
            <CreditCard className="w-4 h-4 mr-2" /> Add Credits via Stripe (Coming Soon)
          </button>
        </div>

        {/* --- API KEYS CARD (Placeholder) --- */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6 border-b pb-4">
            <h3 className="text-lg font-bold flex items-center text-slate-800">
              <Key className="w-5 h-5 mr-2 text-amber-600" /> Machine-to-Machine Keys
            </h3>
          </div>
          
          <p className="text-sm text-slate-600 font-medium mb-6">
            Generate permanent API keys to allow external Python scripts, Zapier, or autonomous agents to upload invoices to this workspace directly.
          </p>

          <button className="w-full py-3 px-4 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-lg font-bold transition-colors flex items-center justify-center">
            <Key className="w-4 h-4 mr-2" /> Generate API Key (Coming Soon)
          </button>
        </div>
      </div>
    </div>
  );
};