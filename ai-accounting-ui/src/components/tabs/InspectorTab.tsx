import { useState } from 'react';

export const InspectorTab = ({ getToken }: any) => {
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM invoices LIMIT 10;');
  const [queryResults, setQueryResults] = useState<any[]>([]);
  const [isQuerying, setIsQuerying] = useState(false);

  const handleRunQuery = async () => {
    setIsQuerying(true);
    try {
      const token = await getToken();
      
      console.log("Sending query to backend:", sqlQuery);
      
      const response = await fetch(`https://ai-erp-api-gfmt.onrender.com/api/inspector/query`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ query: sqlQuery })
      });
      
      // Get the raw text first so we can see EXACTLY what Render sent back
      const responseText = await response.text();
      console.log("Raw Server Response:", responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        data = { error: responseText }; // If it's an HTML error page, catch it here
      }

      if (response.ok) {
        setQueryResults(data.results || []);
      } else {
        // This will now catch data.error, data.detail, OR the raw text!
        const errorMessage = data.error || data.detail || responseText || response.statusText;
        alert(`Server Error: ${errorMessage}`);
      }
    } catch (error) {
      console.error("Fetch failed entirely:", error);
      alert(`Network Error: Ensure the backend is online and CORS is configured.`);
    } finally {
      setIsQuerying(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-2xl font-extrabold mb-6">Database Inspector</h2>
      
      <div className="bg-slate-900 rounded-xl p-4 shadow-lg mb-6">
        <textarea 
          className="w-full bg-slate-800 text-green-400 font-mono p-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={4}
          value={sqlQuery}
          onChange={(e) => setSqlQuery(e.target.value)}
          placeholder="SELECT * FROM invoices WHERE amount > 1000;"
        />
        <div className="flex justify-end mt-4">
          <button 
            onClick={handleRunQuery}
            disabled={isQuerying}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold"
          >
            {isQuerying ? "Running..." : "Execute SQL"}
          </button>
        </div>
      </div>

      {queryResults.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                {Object.keys(queryResults[0]).map((key) => (
                  <th key={key} className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{key}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {queryResults.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  {Object.values(row).map((val: any, colIdx) => (
                    <td key={colIdx} className="p-4 text-sm text-slate-700">
                      {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};