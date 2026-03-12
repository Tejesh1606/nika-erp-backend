import { Plus, ArrowLeft, Edit2, Trash2, ExternalLink, Settings2 } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { DataFilterBar } from '../shared/DataFilterBar';
import { ListToolbar } from '../shared/ListToolbar';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const DashboardsTab = ({
  selectedDashId, setSelectedDashId,
  dashSearch, setDashSearch, dashSort, setDashSort,
  dashboards, reports, saveConfigs,
  setActiveTab, setSelectedReportId,
  processChartData,
  filterText, setFilterText, filterField, setFilterField, filterStatus, setFilterStatus
}: any) => {

  if (!selectedDashId) {
    let viewDashboards = dashboards.filter((d: any) => d.name.toLowerCase().includes(dashSearch.toLowerCase()) || d.description.toLowerCase().includes(dashSearch.toLowerCase()));
    viewDashboards.sort((a: any, b: any) => {
      if (dashSort === 'name_asc') return a.name.localeCompare(b.name);
      if (dashSort === 'name_desc') return b.name.localeCompare(a.name);
      if (dashSort === 'newest') return Number(b.id) - Number(a.id);
      if (dashSort === 'oldest') return Number(a.id) - Number(b.id);
      return 0;
    });

    return (
      <div className="max-w-6xl animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold">Dashboards</h2>
          <button onClick={() => { const id = Date.now().toString(); saveConfigs(reports, [...dashboards, {id, name: 'New Dashboard', description: 'Add a description', reportIds: []}]); setSelectedDashId(id); }} className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg font-bold flex items-center"><Plus className="w-4 h-4 mr-2"/> Create Dashboard</button>
        </div>
        <ListToolbar search={dashSearch} setSearch={setDashSearch} sort={dashSort} setSort={setDashSort} placeholder="Search dashboards by name or description..." />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {viewDashboards.map((d: any) => (
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

  const dash = dashboards.find((d: any) => d.id === selectedDashId);
  if (!dash) return null;

  return (
    <div className="max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <button onClick={() => setSelectedDashId(null)} className="flex items-center text-slate-500 hover:text-slate-800 font-semibold mb-6"><ArrowLeft className="w-4 h-4 mr-1"/> Back to Dashboards</button>
      <div className="flex justify-between items-end mb-6 bg-white p-6 rounded-xl border shadow-sm">
        <div><h2 className="text-3xl font-extrabold text-slate-900">{dash.name}</h2><p className="text-slate-500 mt-1">{dash.description}</p></div>
        <div className="flex gap-3">
          <button onClick={() => { const name = prompt("New Name:", dash.name); if(name) saveConfigs(reports, dashboards.map((d: any) => d.id === dash.id ? {...d, name} : d)); }} className="text-slate-500 hover:text-blue-600 font-semibold text-sm flex items-center border p-2 rounded"><Edit2 className="w-4 h-4 mr-1"/> Edit Name</button>
          <button onClick={() => { saveConfigs(reports, dashboards.filter((d: any) => d.id !== dash.id)); setSelectedDashId(null); }} className="text-red-500 hover:bg-red-50 font-semibold text-sm flex items-center border border-red-200 p-2 rounded"><Trash2 className="w-4 h-4 mr-1"/> Delete Dash</button>
        </div>
      </div>

      <DataFilterBar filterText={filterText} setFilterText={setFilterText} filterField={filterField} setFilterField={setFilterField} filterStatus={filterStatus} setFilterStatus={setFilterStatus} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {(dash.reportIds || []).map((rId: string) => {
          const report = reports.find((r: any) => r.id === rId);
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
                     <PieChart><Pie data={chartData} dataKey="total" cx="50%" cy="50%" outerRadius={80}>{chartData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip/><Legend/></PieChart>}
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
              saveConfigs(reports, dashboards.map((d: any) => d.id === dash.id ? {...d, reportIds: newIds} : d));
            }
          }}>
            <option value="">Select a report to pin...</option>
            {reports.filter((r: any) => !(dash.reportIds || []).includes(r.id)).map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
};