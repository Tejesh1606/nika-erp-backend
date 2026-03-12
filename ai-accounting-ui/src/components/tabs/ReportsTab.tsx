import { Plus, FileText, ArrowLeft, Trash2, Eye, Database, ArrowUp, ArrowDown } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { DataFilterBar } from '../shared/DataFilterBar';
import { ListToolbar } from '../shared/ListToolbar';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
const AVAILABLE_COLUMNS = [ 'vendor_name', 'invoice_number', 'date', 'status', 'amount', 'item_description', 'item_quantity', 'item_total' ];

export const ReportsTab = ({
  selectedReportId, setSelectedReportId,
  reports, dashboards, saveConfigs,
  reportSearch, setReportSearch, reportSort, setReportSort,
  filteredHistoricData, sortConfig, handleSort, getFlattenedData, processChartData, sortData,
  filterText, setFilterText, filterField, setFilterField, filterStatus, setFilterStatus
}: any) => {
  
  const SortableHeader = ({ label, sortKey }: { label: string, sortKey: string }) => (
    <th className="px-4 py-3 cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => handleSort(sortKey)}>
      <div className="flex items-center">
        {label}
        {sortConfig.key === sortKey && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 ml-1 text-blue-600"/> : <ArrowDown className="w-3 h-3 ml-1 text-blue-600"/>)}
      </div>
    </th>
  );

  if (!selectedReportId) {
    let viewReports = reports.filter((r: any) => r.name.toLowerCase().includes(reportSearch.toLowerCase()) || r.description.toLowerCase().includes(reportSearch.toLowerCase()));
    viewReports.sort((a: any, b: any) => {
      if (reportSort === 'name_asc') return a.name.localeCompare(b.name);
      if (reportSort === 'name_desc') return b.name.localeCompare(a.name);
      if (reportSort === 'newest') return Number(b.id) - Number(a.id);
      if (reportSort === 'oldest') return Number(a.id) - Number(b.id);
      return 0;
    });

    return (
      <div className="max-w-6xl animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold">Report Engine</h2>
          <button onClick={() => { const id = Date.now().toString(); saveConfigs([...reports, {id, name: 'Untitled Report', description: '', chartType: 'bar', groupBy: 'vendor_name', columns: ['vendor_name', 'amount']}], dashboards); setSelectedReportId(id); }} className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg font-bold flex items-center"><Plus className="w-4 h-4 mr-2"/> Build New Report</button>
        </div>
        <ListToolbar search={reportSearch} setSearch={setReportSearch} sort={reportSort} setSort={setReportSort} placeholder="Search reports by name or description..." />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {viewReports.map((r: any) => (
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

  const rep = reports.find((r: any) => r.id === selectedReportId);
  if (!rep) return null;
  
  const chartData = processChartData(rep);
  const safeGroupBy = rep.groupBy || '';
  const safeColumns = rep.columns || [];
  
  const isItemReport = safeGroupBy.includes('item') || safeColumns.some((c:string) => c.includes('item'));
  const tableData = sortData(isItemReport ? getFlattenedData(filteredHistoricData) : filteredHistoricData, sortConfig);

  const updateReport = (updates: any) => saveConfigs(reports.map((r: any) => r.id === rep.id ? {...r, ...updates} : r), dashboards);

  return (
    <div className="max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <button onClick={() => setSelectedReportId(null)} className="flex items-center text-slate-500 hover:text-slate-800 font-semibold mb-6"><ArrowLeft className="w-4 h-4 mr-1"/> Back to Reports</button>
      
      <div className="bg-white p-6 rounded-xl border shadow-sm mb-6 flex justify-between items-start">
        <div className="flex-1 grid grid-cols-3 gap-6 mr-8">
          <div><label className="text-xs font-bold uppercase text-slate-500">Report Name</label><input className="w-full border-b border-transparent hover:border-slate-300 focus:border-blue-500 p-1 text-2xl font-bold outline-none bg-transparent transition-colors" value={rep.name} onChange={e => updateReport({name: e.target.value})} /></div>
          <div><label className="text-xs font-bold uppercase text-slate-500">Description</label><input className="w-full border-b border-transparent hover:border-slate-300 focus:border-blue-500 p-1 mt-1 outline-none bg-transparent transition-colors" value={rep.description} onChange={e => updateReport({description: e.target.value})} /></div>
          <div><label className="text-xs font-bold uppercase text-slate-500">Group By (Chart Axis)</label><select className="w-full border-b hover:border-slate-300 p-1 mt-1 outline-none bg-transparent cursor-pointer" value={rep.groupBy} onChange={e => updateReport({groupBy: e.target.value})}><option value="vendor_name">Vendor</option><option value="status">Status</option><option value="date">Date</option><option value="item_description">Line Item Product</option></select></div>
        </div>
        <button onClick={() => { saveConfigs(reports.filter((r: any) => r.id !== rep.id), dashboards); setSelectedReportId(null); }} className="text-red-500 hover:bg-red-50 font-bold px-3 py-2 rounded flex items-center text-sm"><Trash2 className="w-4 h-4 mr-1"/> Delete</button>
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
               <PieChart><Pie data={chartData} dataKey="total" cx="50%" cy="50%" outerRadius={100}>{chartData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip/><Legend/></PieChart>}
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