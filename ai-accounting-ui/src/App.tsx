import { Analytics } from "@vercel/analytics/react";
import { SignedIn, SignedOut, SignIn, UserButton, useAuth } from "@clerk/clerk-react";
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { UploadCloud, LayoutDashboard, FileText, Database, Plus, Settings2, Trash2, Edit2, Save, X, ChevronDown, Search, Filter, ArrowLeft, ArrowUp, ArrowDown, ExternalLink, Eye, SortDesc, Menu } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
const AVAILABLE_COLUMNS = [ 'vendor_name', 'invoice_number', 'date', 'status', 'amount', 'item_description', 'item_quantity', 'item_total' ];

// ============================================================================
// EXTRACTED COMPONENTS
// ============================================================================

const DataFilterBar = ({ filterText, setFilterText, filterField, setFilterField, filterStatus, setFilterStatus }: any) => (
  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-wrap gap-4 items-center">
    <div className="flex items-center text-slate-500 font-bold px-2"><Filter className="w-5 h-5 mr-2"/> Data Filters:</div>
    <div className="flex items-center bg-slate-50 border border-slate-300 rounded-lg p-1 flex-1">
      <select className="bg-transparent text-sm font-semibold outline-none px-2 text-slate-600 cursor-pointer" value={filterField} onChange={e => setFilterField(e.target.value)}>
        <option value="all">All Fields</option>
        <option value="vendor">Vendor Name</option>
        <option value="invoice">Invoice #</option>
        <option value="item">Line Item</option>
      </select>
      <div className="h-6 w-px bg-slate-300 mx-2"></div>
      <Search className="w-4 h-4 text-slate-400 ml-1" />
      <input type="text" placeholder="Type to filter data..." className="bg-transparent outline-none px-2 w-full text-sm py-1" value={filterText} onChange={e => setFilterText(e.target.value)} />
    </div>
    <div className="w-48">
      <select className="w-full border border-slate-300 p-2 text-sm rounded-lg outline-none font-semibold text-slate-600 cursor-pointer bg-white" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
        <option value="All">All Statuses</option>
        <option value="Pending">Pending</option>
        <option value="Paid">Paid</option>
        <option value="Overdue">Overdue</option>
      </select>
    </div>
  </div>
);

const ListToolbar = ({ search, setSearch, sort, setSort, placeholder }: any) => (
  <div className="flex gap-4 mb-6">
    <div className="flex-1 relative">
      <Search className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
      <input type="text" placeholder={placeholder} className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={search} onChange={e => setSearch(e.target.value)} />
    </div>
    <div className="w-64 relative">
      <SortDesc className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
      <select className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg outline-none font-semibold text-slate-600 bg-white cursor-pointer" value={sort} onChange={e => setSort(e.target.value)}>
        <option value="newest">Sort: Newest First</option>
        <option value="oldest">Sort: Oldest First</option>
        <option value="name_asc">Sort: Name (A-Z)</option>
        <option value="name_desc">Sort: Name (Z-A)</option>
      </select>
    </div>
  </div>
);

// ============================================================================
// MAIN APPLICATION
// ============================================================================

export default function App() {
  const { getToken } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'dashboard' | 'reports' | 'invoices'>('upload');
  
  const [selectedDashId, setSelectedDashId] = useState<string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  
  const [historicData, setHistoricData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [dashboards, setDashboards] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);

  // --- DATA FILTER & SORT STATE ---
  const [filterText, setFilterText] = useState('');
  const [filterField, setFilterField] = useState('all'); 
  const [filterStatus, setFilterStatus] = useState('All');
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

  // --- LIST AREA STATE ---
  const [dashSearch, setDashSearch] = useState('');
  const [dashSort, setDashSort] = useState('newest');
  const [reportSearch, setReportSearch] = useState('');
  const [reportSort, setReportSort] = useState('newest');

  // LEDGER STATE
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>(null);

  useEffect(() => {
    fetchHistory();
    try {
      const savedReports = JSON.parse(localStorage.getItem('reports') || '[]');
      const savedDashboards = JSON.parse(localStorage.getItem('dashboards') || '[]');
      
      if (savedReports.length === 0) {
        const defReports = [{ id: Date.now().toString(), name: 'Vendor Spend', description: 'Total amounts grouped by vendor', chartType: 'bar', groupBy: 'vendor_name', columns: ['vendor_name', 'amount', 'date'] }];
        setReports(defReports); localStorage.setItem('reports', JSON.stringify(defReports));
      } else setReports(savedReports);

      if (savedDashboards.length === 0) {
        const defDash = [{ id: (Date.now()+1).toString(), name: 'Main Executive Dashboard', description: 'High-level financial overview', reportIds: [savedReports.length === 0 ? Date.now().toString() : savedReports[0].id] }];
        setDashboards(defDash); localStorage.setItem('dashboards', JSON.stringify(defDash));
      } else setDashboards(savedDashboards);
    } catch (e) {
      console.error("Local storage cleared", e);
      localStorage.removeItem('reports'); localStorage.removeItem('dashboards');
    }
  }, []);

  const saveConfigs = (newReports: any[], newDashboards: any[]) => {
    setReports(newReports); setDashboards(newDashboards);
    localStorage.setItem('reports', JSON.stringify(newReports));
    localStorage.setItem('dashboards', JSON.stringify(newDashboards));
  };

  const fetchHistory = async () => {
    try {
      const token = await getToken(); // Get the ID Badge
      const res = await fetch('https://ai-erp-api-gfmt.onrender.com/invoices/', {
        headers: { Authorization: `Bearer ${token}` } // Flash the badge to Python
      });
      const json = await res.json();
      setHistoricData(json.data || []);
    } catch (err) { console.error("Fetch failed", err); }
  };

  const handleSort = (key: string) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const sortData = (data: any[], config: {key: string, direction: string}) => {
    return [...data].sort((a, b) => {
      let valA = a[config.key]; let valB = b[config.key];
      if (['amount', 'item_quantity', 'item_total'].includes(config.key)) {
        valA = Number(valA || 0); valB = Number(valB || 0);
      } else {
        valA = (valA || '').toString().toLowerCase(); valB = (valB || '').toString().toLowerCase();
      }
      if (valA < valB) return config.direction === 'asc' ? -1 : 1;
      if (valA > valB) return config.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const filteredHistoricData = useMemo(() => {
    let filtered = historicData.filter(inv => {
      const searchLower = filterText.toLowerCase();
      let matchesSearch = true;
      
      if (filterText) {
        if (filterField === 'vendor') matchesSearch = (inv.vendor_name || '').toLowerCase().includes(searchLower);
        else if (filterField === 'invoice') matchesSearch = (inv.invoice_number || '').toLowerCase().includes(searchLower);
        else if (filterField === 'item') matchesSearch = (inv.items || []).some((i: any) => (i.description || '').toLowerCase().includes(searchLower));
        else {
          matchesSearch = (inv.vendor_name || '').toLowerCase().includes(searchLower) || 
                          (inv.invoice_number || '').toLowerCase().includes(searchLower) || 
                          (inv.items || []).some((i: any) => (i.description || '').toLowerCase().includes(searchLower));
        }
      }
      const matchesStatus = filterStatus === 'All' || inv.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
    return sortData(filtered, sortConfig);
  }, [historicData, filterText, filterStatus, filterField, sortConfig]);

  const getFlattenedData = (sourceData: any[]) => {
    let flat: any[] = [];
    sourceData.forEach(inv => {
      if (inv.items && inv.items.length > 0) {
        inv.items.forEach((item: any) => { flat.push({ ...inv, item_description: item.description, item_quantity: item.quantity, item_total: item.total_price }); });
      } else flat.push({ ...inv, item_description: '-', item_quantity: 0, item_total: 0 });
    });
    return flat;
  };

  const processChartData = (report: any) => {
    const groupBy = report.groupBy || 'vendor_name';
    const dataToProcess = groupBy.includes('item') ? getFlattenedData(filteredHistoricData) : filteredHistoricData;
    
    const grouped = dataToProcess.reduce((acc: any, curr: any) => {
      const key = curr[groupBy] || 'Unknown';
      if (!acc[key]) acc[key] = { name: key, total: 0 };
      acc[key].total += (Number(curr.item_total) || Number(curr.amount) || 0);
      return acc;
    }, {});
    return Object.values(grouped).sort((a: any, b: any) => b.total - a.total);
  };

  const SortableHeader = ({ label, sortKey }: { label: string, sortKey: string }) => (
    <th className="px-4 py-3 cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => handleSort(sortKey)}>
      <div className="flex items-center">
        {label}
        {sortConfig.key === sortKey && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 ml-1 text-blue-600"/> : <ArrowDown className="w-3 h-3 ml-1 text-blue-600"/>)}
      </div>
    </th>
  );

  // --- VIEWS ---

  const renderUploadTab = () => (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-slate-200">
      <h2 className="text-2xl font-bold mb-6 text-center">AI Data Extraction</h2>
      <div onClick={() => fileInputRef.current?.click()} onDragOver={e => e.preventDefault()} onDrop={e => {e.preventDefault(); if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0])}} className={`border-2 border-dashed p-12 text-center rounded-xl cursor-pointer transition-colors ${file ? 'border-green-500 bg-green-50' : 'border-slate-300 hover:bg-slate-50'}`}>
        <input type="file" className="hidden" ref={fileInputRef} onChange={e => e.target.files && setFile(e.target.files[0])} />
        <UploadCloud className={`w-12 h-12 mx-auto mb-4 ${file ? 'text-green-500' : 'text-blue-500'}`} />
        <p className="font-semibold text-slate-700">{file ? file.name : "Drag & drop invoice image here"}</p>
      </div>
      {error && <p className="text-red-500 mt-4 text-center font-semibold">{error}</p>}
      <button onClick={async () => {
        if (!file) return;
        setLoading(true); setError(null);
        
        const token = await getToken(); // GET TOKEN
        const formData = new FormData(); 
        formData.append('file', file);
        
        try {
          const res = await fetch('https://ai-erp-api-gfmt.onrender.com/upload-invoice/', { 
            method: 'POST', 
            headers: { Authorization: `Bearer ${token}` }, // ATTACH SECURE HEADER
            body: formData 
          });
          const result = await res.json();
          if (!res.ok) throw new Error(result.error);
          alert(`Success! You have ${result.credits_remaining} API credits left.`); 
          setFile(null); 
          fetchHistory();
        } catch (e: any) { setError(e.message); } finally { setLoading(false); }
      }} disabled={!file || loading} className={`w-full mt-6 py-4 rounded-lg font-bold text-white transition-all ${file && !loading ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-300'}`}>{loading ? "Processing via AI..." : "Process Invoice"}</button>
    </div>
  );

  const renderDashboardsTab = () => {
    if (!selectedDashId) {
      let viewDashboards = dashboards.filter(d => d.name.toLowerCase().includes(dashSearch.toLowerCase()) || d.description.toLowerCase().includes(dashSearch.toLowerCase()));
      viewDashboards.sort((a, b) => {
        if (dashSort === 'name_asc') return a.name.localeCompare(b.name);
        if (dashSort === 'name_desc') return b.name.localeCompare(a.name);
        if (dashSort === 'newest') return Number(b.id) - Number(a.id);
        if (dashSort === 'oldest') return Number(a.id) - Number(b.id);
        return 0;
      });

      return (
        <div className="max-w-6xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold">Dashboards</h2>
            <button onClick={() => { const id = Date.now().toString(); saveConfigs(reports, [...dashboards, {id, name: 'New Dashboard', description: 'Add a description', reportIds: []}]); setSelectedDashId(id); }} className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg font-bold flex items-center"><Plus className="w-4 h-4 mr-2"/> Create Dashboard</button>
          </div>
          <ListToolbar search={dashSearch} setSearch={setDashSearch} sort={dashSort} setSort={setDashSort} placeholder="Search dashboards by name or description..." />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {viewDashboards.map(d => (
              <div key={d.id} onClick={() => setSelectedDashId(d.id)} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:shadow-md hover:border-blue-400 transition-all group">
                <h3 className="text-xl font-bold text-slate-800 group-hover:text-blue-600">{d.name}</h3>
                <p className="text-slate-500 mt-2 h-10">{d.description}</p>
                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center text-sm font-semibold text-slate-400">
                  <span>{(d.reportIds || []).length} Reports</span><span className="text-blue-500 group-hover:underline">Open Dash &rarr;</span>
                </div>
              </div>
            ))}
            {viewDashboards.length === 0 && <p className="col-span-3 text-center text-slate-400 italic py-10">No dashboards match your search.</p>}
          </div>
        </div>
      );
    }

    const dash = dashboards.find(d => d.id === selectedDashId);
    if (!dash) return null;

    return (
      <div className="max-w-7xl">
        <button onClick={() => setSelectedDashId(null)} className="flex items-center text-slate-500 hover:text-slate-800 font-semibold mb-6"><ArrowLeft className="w-4 h-4 mr-1"/> Back to Dashboards</button>
        <div className="flex justify-between items-end mb-6 bg-white p-6 rounded-xl border shadow-sm">
          <div><h2 className="text-3xl font-extrabold text-slate-900">{dash.name}</h2><p className="text-slate-500 mt-1">{dash.description}</p></div>
          <div className="flex gap-3">
            <button onClick={() => { const name = prompt("New Name:", dash.name); if(name) saveConfigs(reports, dashboards.map(d => d.id === dash.id ? {...d, name} : d)); }} className="text-slate-500 hover:text-blue-600 font-semibold text-sm flex items-center border p-2 rounded"><Edit2 className="w-4 h-4 mr-1"/> Edit Name</button>
            <button onClick={() => { saveConfigs(reports, dashboards.filter(d => d.id !== dash.id)); setSelectedDashId(null); }} className="text-red-500 hover:bg-red-50 font-semibold text-sm flex items-center border border-red-200 p-2 rounded"><Trash2 className="w-4 h-4 mr-1"/> Delete Dash</button>
          </div>
        </div>

        <DataFilterBar filterText={filterText} setFilterText={setFilterText} filterField={filterField} setFilterField={setFilterField} filterStatus={filterStatus} setFilterStatus={setFilterStatus} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {(dash.reportIds || []).map((rId: string) => {
            const report = reports.find(r => r.id === rId);
            if (!report) return null;
            const chartData = processChartData(report);
            return (
              <div key={rId} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div><h3 className="text-lg font-bold">{report.name}</h3><p className="text-xs text-slate-500">{report.description}</p></div>
                  <button onClick={() => { setActiveTab('reports'); setSelectedReportId(report.id); }} className="text-blue-600 hover:text-blue-800 text-sm font-bold flex items-center bg-blue-50 px-3 py-1 rounded-full"><ExternalLink className="w-3 h-3 mr-1"/> Full Report</button>
                </div>
                <div className="flex-1 min-h-[250px]">
                  {chartData.length === 0 ? <p className="text-center text-slate-400 italic mt-12">No data matching filters</p> : (
                    <ResponsiveContainer width="100%" height="100%">
                      {report.chartType === 'bar' ? <BarChart data={chartData}><CartesianGrid vertical={false} stroke="#e2e8f0"/><XAxis dataKey="name" tick={{fontSize:12}}/><YAxis tick={{fontSize:12}}/><Tooltip/><Bar dataKey="total" fill="#3b82f6" radius={[4,4,0,0]}/></BarChart> :
                       report.chartType === 'line' ? <LineChart data={chartData}><CartesianGrid vertical={false} stroke="#e2e8f0"/><XAxis dataKey="name" tick={{fontSize:12}}/><YAxis tick={{fontSize:12}}/><Tooltip/><Line dataKey="total" stroke="#10b981" strokeWidth={3}/></LineChart> :
                       <PieChart><Pie data={chartData} dataKey="total" cx="50%" cy="50%" outerRadius={80}>{chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip/><Legend/></PieChart>}
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            );
          })}
          
          <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center text-center">
            <Settings2 className="w-8 h-8 text-slate-400 mb-2"/>
            <p className="font-bold text-slate-600 mb-4">Pin a Report to this Dashboard</p>
            <select className="border p-2 rounded w-64 bg-white outline-none mb-2 cursor-pointer" onChange={(e) => {
              if(e.target.value) {
                const newIds = (dash.reportIds || []).includes(e.target.value) ? dash.reportIds : [...(dash.reportIds || []), e.target.value];
                saveConfigs(reports, dashboards.map(d => d.id === dash.id ? {...d, reportIds: newIds} : d));
              }
            }}>
              <option value="">Select a report to pin...</option>
              {reports.filter(r => !(dash.reportIds || []).includes(r.id)).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
        </div>
      </div>
    );
  };

  const renderReportsTab = () => {
    if (!selectedReportId) {
      let viewReports = reports.filter(r => r.name.toLowerCase().includes(reportSearch.toLowerCase()) || r.description.toLowerCase().includes(reportSearch.toLowerCase()));
      viewReports.sort((a, b) => {
        if (reportSort === 'name_asc') return a.name.localeCompare(b.name);
        if (reportSort === 'name_desc') return b.name.localeCompare(a.name);
        if (reportSort === 'newest') return Number(b.id) - Number(a.id);
        if (reportSort === 'oldest') return Number(a.id) - Number(b.id);
        return 0;
      });

      return (
        <div className="max-w-6xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold">Report Engine</h2>
            <button onClick={() => { const id = Date.now().toString(); saveConfigs([...reports, {id, name: 'Untitled Report', description: '', chartType: 'bar', groupBy: 'vendor_name', columns: ['vendor_name', 'amount']}], dashboards); setSelectedReportId(id); }} className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg font-bold flex items-center"><Plus className="w-4 h-4 mr-2"/> Build New Report</button>
          </div>
          <ListToolbar search={reportSearch} setSearch={setReportSearch} sort={reportSort} setSort={setReportSort} placeholder="Search reports by name or description..." />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {viewReports.map(r => (
              <div key={r.id} onClick={() => setSelectedReportId(r.id)} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:shadow-md hover:border-blue-400 transition-all group">
                <div className="flex items-center mb-2"><FileText className="w-4 h-4 mr-2 text-blue-500"/><h3 className="font-bold text-slate-800 group-hover:text-blue-600">{r.name}</h3></div>
                <p className="text-xs text-slate-500 h-8">{r.description}</p>
                <div className="mt-3 text-xs font-semibold text-slate-400">Groups by: {(r.groupBy || '').replace('_', ' ')}</div>
              </div>
            ))}
            {viewReports.length === 0 && <p className="col-span-4 text-center text-slate-400 italic py-10">No reports match your search.</p>}
          </div>
        </div>
      );
    }

    const rep = reports.find(r => r.id === selectedReportId);
    if (!rep) return null;
    
    const chartData = processChartData(rep);
    const safeGroupBy = rep.groupBy || '';
    const safeColumns = rep.columns || [];
    
    const isItemReport = safeGroupBy.includes('item') || safeColumns.some((c:string) => c.includes('item'));
    const tableData = sortData(isItemReport ? getFlattenedData(filteredHistoricData) : filteredHistoricData, sortConfig);

    const updateReport = (updates: any) => saveConfigs(reports.map(r => r.id === rep.id ? {...r, ...updates} : r), dashboards);

    return (
      <div className="max-w-7xl">
        <button onClick={() => setSelectedReportId(null)} className="flex items-center text-slate-500 hover:text-slate-800 font-semibold mb-6"><ArrowLeft className="w-4 h-4 mr-1"/> Back to Reports</button>
        
        <div className="bg-white p-6 rounded-xl border shadow-sm mb-6 flex justify-between items-start">
          <div className="flex-1 grid grid-cols-3 gap-6 mr-8">
            <div><label className="text-xs font-bold uppercase text-slate-500">Report Name</label><input className="w-full border-b border-transparent hover:border-slate-300 focus:border-blue-500 p-1 text-2xl font-bold outline-none bg-transparent transition-colors" value={rep.name} onChange={e => updateReport({name: e.target.value})} /></div>
            <div><label className="text-xs font-bold uppercase text-slate-500">Description</label><input className="w-full border-b border-transparent hover:border-slate-300 focus:border-blue-500 p-1 mt-1 outline-none bg-transparent transition-colors" value={rep.description} onChange={e => updateReport({description: e.target.value})} /></div>
            <div><label className="text-xs font-bold uppercase text-slate-500">Group By (Chart Axis)</label><select className="w-full border-b hover:border-slate-300 p-1 mt-1 outline-none bg-transparent cursor-pointer" value={rep.groupBy} onChange={e => updateReport({groupBy: e.target.value})}><option value="vendor_name">Vendor</option><option value="status">Status</option><option value="date">Date</option><option value="item_description">Line Item Product</option></select></div>
          </div>
          <button onClick={() => { saveConfigs(reports.filter(r => r.id !== rep.id), dashboards); setSelectedReportId(null); }} className="text-red-500 hover:bg-red-50 font-bold px-3 py-2 rounded flex items-center text-sm"><Trash2 className="w-4 h-4 mr-1"/> Delete</button>
        </div>

        <DataFilterBar filterText={filterText} setFilterText={setFilterText} filterField={filterField} setFilterField={setFilterField} filterStatus={filterStatus} setFilterStatus={setFilterStatus} />

        <div className="bg-white p-6 rounded-xl shadow-sm border mb-6 relative">
          <div className="absolute top-4 right-6 flex gap-2 z-10">
            {['bar', 'line', 'pie'].map(t => (
              <button key={t} onClick={() => updateReport({chartType: t})} className={`px-3 py-1 rounded text-xs font-bold uppercase ${rep.chartType === t ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{t}</button>
            ))}
          </div>
          <h3 className="font-bold mb-6 flex items-center"><Eye className="w-4 h-4 mr-2 text-slate-400"/> Data Visualization</h3>
          <div className="h-72">
            {chartData.length === 0 ? <p className="text-center text-slate-400 italic mt-20">No data matching filters</p> : (
              <ResponsiveContainer width="100%" height="100%">
                {rep.chartType === 'bar' ? <BarChart data={chartData}><CartesianGrid vertical={false} stroke="#e2e8f0"/><XAxis dataKey="name" tick={{fontSize:12}}/><YAxis tick={{fontSize:12}}/><Tooltip/><Bar dataKey="total" fill="#3b82f6" radius={[4,4,0,0]}/></BarChart> :
                 rep.chartType === 'line' ? <LineChart data={chartData}><CartesianGrid vertical={false} stroke="#e2e8f0"/><XAxis dataKey="name" tick={{fontSize:12}}/><YAxis tick={{fontSize:12}}/><Tooltip/><Line dataKey="total" stroke="#10b981" strokeWidth={3}/></LineChart> :
                 <PieChart><Pie data={chartData} dataKey="total" cx="50%" cy="50%" outerRadius={100}>{chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip/><Legend/></PieChart>}
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-4 bg-slate-50 border-b flex flex-col">
            <h3 className="font-bold flex items-center mb-3"><Database className="w-4 h-4 mr-2 text-slate-400"/> Custom Data Table</h3>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase mr-2 pt-1">Toggle Columns:</span>
              {AVAILABLE_COLUMNS.map(col => {
                const isSelected = safeColumns.includes(col);
                return (
                  <button key={col} onClick={() => {
                    const cols = isSelected ? safeColumns.filter((c:string) => c !== col) : [...safeColumns, col];
                    updateReport({columns: cols});
                  }} className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${isSelected ? 'bg-blue-100 border-blue-500 text-blue-700' : 'bg-white border-slate-300 text-slate-500 hover:bg-slate-50'}`}>{col.replace('_', ' ')}</button>
                )
              })}
            </div>
          </div>
          
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-sm text-left relative">
              <thead className="bg-slate-100 text-xs uppercase text-slate-500 border-b sticky top-0 z-10 shadow-sm">
                <tr>
                  {safeColumns.length === 0 ? <th className="p-4">Please select columns above</th> : safeColumns.map((c: string) => <SortableHeader key={c} label={c.replace('_', ' ')} sortKey={c} />)}
                </tr>
              </thead>
              <tbody>
                {tableData.length === 0 ? <tr><td colSpan={safeColumns.length || 1} className="p-8 text-center text-slate-400 italic">No records match your data filters.</td></tr> : tableData.map((row: any, i: number) => (
                  <tr key={i} className="border-b hover:bg-slate-50">
                    {safeColumns.map((c: string) => {
                      const val = row[c] !== null && row[c] !== undefined ? row[c] : '-';
                      return <td key={c} className={`px-4 py-3 ${['amount', 'item_total', 'item_quantity'].includes(c) ? 'font-mono' : ''}`}>{['amount', 'item_total'].includes(c) && val !== '-' ? `$${Number(val).toFixed(2)}` : val}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderInvoicesTab = () => {
    const handleItemChange = (index: number, field: string, value: string) => {
      const newItems = [...editForm.items];
      newItems[index][field] = value;
      if (field === 'quantity' || field === 'unit_price') {
         newItems[index].total_price = (parseFloat(newItems[index].quantity || 0) * parseFloat(newItems[index].unit_price || 0)).toFixed(2);
      }
      setEditForm({...editForm, items: newItems});
    };

    return (
      <div>
        <DataFilterBar filterText={filterText} setFilterText={setFilterText} filterField={filterField} setFilterField={setFilterField} filterStatus={filterStatus} setFilterStatus={setFilterStatus} />
        
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="p-5 bg-slate-50 border-b flex justify-between items-center">
            <h2 className="text-xl font-bold">Master Editable Ledger</h2>
            <span className="text-sm font-semibold text-slate-500 bg-slate-200 px-3 py-1 rounded-full">{filteredHistoricData.length} records</span>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase text-slate-500 border-b">
              <tr><SortableHeader label="Date" sortKey="date"/><SortableHeader label="Vendor" sortKey="vendor_name"/><SortableHeader label="Invoice #" sortKey="invoice_number"/><SortableHeader label="Status" sortKey="status"/><SortableHeader label="Amount" sortKey="amount"/><th className="p-4"></th></tr>
            </thead>
            <tbody>
              {filteredHistoricData.map((inv) => (
                <React.Fragment key={inv.id}>
                  <tr className={`border-b hover:bg-slate-50 transition-colors ${expandedId === inv.id ? 'bg-blue-50' : ''}`}>
                    <td className="p-4">{inv.date}</td><td className="p-4 font-bold text-slate-800">{inv.vendor_name}</td><td className="p-4">{inv.invoice_number}</td>
                    <td className="p-4"><span className={`px-2 py-1 rounded-full text-xs font-bold ${inv.status === 'Paid' ? 'bg-green-100 text-green-800' : inv.status === 'Overdue' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{inv.status}</span></td>
                    <td className="p-4 font-bold font-mono text-blue-600">${Number(inv.amount || 0).toFixed(2)}</td>
                    <td className="p-4 text-right">
                      {editForm?.id === inv.id 
                        ? <button onClick={() => {setEditForm(null); setExpandedId(null);}} className="text-red-500 font-bold hover:bg-red-50 p-2 rounded-full"><X className="w-5 h-5"/></button>
                        : <button onClick={() => {setExpandedId(inv.id); setEditForm(JSON.parse(JSON.stringify(inv)));}} className="text-blue-600 font-semibold flex items-center justify-end w-full hover:text-blue-800">Edit <ChevronDown className="w-4 h-4 ml-1"/></button>}
                    </td>
                  </tr>
                  
                  {editForm?.id === inv.id && (
                    <tr>
                      <td colSpan={6} className="bg-slate-800 p-6 shadow-inner">
                        <div className="bg-white rounded-xl p-6 shadow-xl">
                          <h4 className="font-bold text-lg mb-4 border-b pb-2 text-slate-800">Edit Header Data</h4>
                          <div className="grid grid-cols-4 gap-4 mb-8">
                            <div><label className="text-xs font-bold uppercase text-slate-500">Vendor</label><input className="w-full border p-2 rounded mt-1" value={editForm.vendor_name} onChange={e => setEditForm({...editForm, vendor_name: e.target.value})} /></div>
                            <div><label className="text-xs font-bold uppercase text-slate-500">Invoice #</label><input className="w-full border p-2 rounded mt-1" value={editForm.invoice_number} onChange={e => setEditForm({...editForm, invoice_number: e.target.value})} /></div>
                            <div><label className="text-xs font-bold uppercase text-slate-500">Status</label><select className="w-full border p-2 rounded mt-1 bg-white" value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})}><option>Pending</option><option>Paid</option><option>Overdue</option></select></div>
                            <div><label className="text-xs font-bold uppercase text-slate-500">Grand Total Amount</label><input type="number" className="w-full border p-2 rounded mt-1 font-bold text-blue-600 font-mono" value={editForm.amount} onChange={e => setEditForm({...editForm, amount: parseFloat(e.target.value)})} /></div>
                          </div>
                          
                          <h4 className="font-bold text-lg mb-4 border-b pb-2 text-slate-800">Edit Line Items</h4>
                          <table className="w-full text-left text-sm mb-4">
                            <thead className="bg-slate-100 text-slate-600"><tr><th className="p-2 rounded-l-md">Description</th><th className="p-2 w-24">Qty</th><th className="p-2 w-32">Unit Price</th><th className="p-2 w-32">Total Price</th><th className="p-2 w-10 rounded-r-md"></th></tr></thead>
                            <tbody>
                              {(editForm.items || []).map((item: any, idx: number) => (
                                <tr key={idx} className="border-b">
                                  <td className="p-2"><input className="w-full border border-slate-200 p-1.5 rounded" value={item.description} onChange={e => { const items = [...editForm.items]; items[idx].description = e.target.value; setEditForm({...editForm, items}); }} /></td>
                                  <td className="p-2"><input type="number" className="w-full border border-slate-200 p-1.5 rounded text-center" value={item.quantity} onChange={e => handleItemChange(idx, 'quantity', e.target.value)} /></td>
                                  <td className="p-2"><input type="number" className="w-full border border-slate-200 p-1.5 rounded text-right" value={item.unit_price} onChange={e => handleItemChange(idx, 'unit_price', e.target.value)} /></td>
                                  <td className="p-2"><input type="number" className="w-full border border-slate-200 p-1.5 rounded text-right font-bold bg-slate-50 font-mono" value={item.total_price} onChange={e => handleItemChange(idx, 'total_price', e.target.value)} /></td>
                                  <td className="p-2 text-center"><button onClick={() => setEditForm({...editForm, items: editForm.items.filter((_:any, i:number) => i !== idx)})} className="text-red-500 hover:bg-red-50 p-1 rounded"><X className="w-4 h-4"/></button></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <button onClick={() => setEditForm({...editForm, items: [...(editForm.items || []), {description: 'New Item', quantity: 1, unit_price: 0, total_price: 0}]})} className="text-sm font-bold text-blue-600 mb-6 px-3 py-1.5 bg-blue-50 rounded hover:bg-blue-100 transition-colors">+ Add Line Item</button>
                          
                          <div className="flex justify-end gap-4 border-t pt-4">
                            <button onClick={() => {setEditForm(null); setExpandedId(null);}} className="px-6 py-2 rounded-lg text-slate-600 font-bold hover:bg-slate-100 transition-colors">Cancel</button>
                            <button onClick={async () => {
                              try {
                                const token = await getToken(); // GET TOKEN
                                const res = await fetch(`https://ai-erp-api-gfmt.onrender.com/invoices/${editForm.id}`, { 
                                  method: 'PUT', 
                                  headers: { 
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}` // ATTACH SECURE HEADER
                                  }, 
                                  body: JSON.stringify(editForm) 
                                });
                                if (!res.ok) throw new Error((await res.json()).error);
                                setEditForm(null); setExpandedId(null); fetchHistory();
                              } catch (err: any) { alert(`Error: ${err.message}`); }
                            }} className="px-6 py-2 rounded-lg bg-green-600 hover:bg-green-700 transition-colors text-white font-bold flex items-center shadow-md"><Save className="w-4 h-4 mr-2"/> Save Deep Edits</button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {filteredHistoricData.length === 0 && <tr><td colSpan={6} className="p-12 text-center text-slate-400 font-semibold italic">No records match your data filters.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <>
      <SignedOut>
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">AI ERP SYSTEM</h1>
            <p className="text-slate-500 mt-2 font-medium">Sign in to access your secure workspace.</p>
          </div>
          <div className="shadow-2xl rounded-2xl overflow-hidden border border-slate-200">
            <SignIn routing="hash" />
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        <div className="min-h-screen flex flex-col md:flex-row bg-slate-100 text-slate-900 font-sans">
          
          {/* MOBILE TOP NAVIGATION BAR */}
          <div className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center shadow-md z-40 relative">
            <div className="flex items-center gap-3">
              <div className="bg-white rounded-full p-0.5 shadow-sm"><UserButton afterSignOutUrl="/"/></div>
              <h1 className="text-lg font-extrabold tracking-wider">Nika ERP</h1>
            </div>
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-300 hover:text-white">
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* MOBILE OVERLAY (Darkens background when menu is open) */}
          {isMobileMenuOpen && (
            <div 
              className="fixed inset-0 bg-black/50 z-40 md:hidden" 
              onClick={() => setIsMobileMenuOpen(false)}
            />
          )}

          {/* SIDEBAR (Hidden on mobile, slides in when active) */}
          <div className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-slate-900 text-slate-300 flex flex-col p-4 shadow-xl shrink-0 z-50 transform transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
            
            <div className="flex justify-between items-center mb-8 pl-4 pt-4">
              <div className="flex items-center gap-3 hidden md:flex">
                <div className="bg-white rounded-full p-0.5 shadow-sm"><UserButton afterSignOutUrl="/"/></div>
                <h1 className="text-lg font-extrabold text-white tracking-wider">Nika ERP</h1>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden p-2 text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <nav className="flex flex-col gap-2">
              <button onClick={() => {setActiveTab('upload'); setSelectedDashId(null); setSelectedReportId(null); setIsMobileMenuOpen(false);}} className={`flex items-center px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'upload' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}><UploadCloud className="w-5 h-5 mr-3"/> Upload Invoice</button>
              <button onClick={() => {setActiveTab('dashboard'); setSelectedReportId(null); setIsMobileMenuOpen(false);}} className={`flex items-center px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}><LayoutDashboard className="w-5 h-5 mr-3"/> Dashboards</button>
              <button onClick={() => {setActiveTab('reports'); setSelectedDashId(null); setIsMobileMenuOpen(false);}} className={`flex items-center px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'reports' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}><FileText className="w-5 h-5 mr-3"/> Report Engine</button>
              <button onClick={() => {setActiveTab('invoices'); setSelectedDashId(null); setSelectedReportId(null); setIsMobileMenuOpen(false);}} className={`flex items-center px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'invoices' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}><Database className="w-5 h-5 mr-3"/> Master Ledger</button>
            </nav>
          </div>

          {/* MAIN CONTENT AREA */}
          <div className="flex-1 p-4 md:p-10 overflow-auto h-[calc(100vh-72px)] md:h-screen w-full">
            {activeTab === 'upload' && renderUploadTab()}
            {activeTab === 'dashboard' && renderDashboardsTab()}
            {activeTab === 'reports' && renderReportsTab()}
            {activeTab === 'invoices' && renderInvoicesTab()}
          </div>

        </div>
      </SignedIn>
    </>
  );
}