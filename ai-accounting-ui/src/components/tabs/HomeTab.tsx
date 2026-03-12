import { UploadCloud, LayoutDashboard, FileText, Database, Settings, TerminalSquare } from 'lucide-react';

export const HomeTab = ({ setActiveTab }: any) => {
  // Define our modules array for easy mapping
  const apps = [
    { id: 'upload', title: 'AI Data Extraction', desc: 'Upload and automatically parse invoices using AI vision.', icon: UploadCloud, color: 'text-blue-500', bg: 'bg-blue-50' },
    { id: 'dashboard', title: 'Executive Dashboards', desc: 'View high-level financial overviews and pinned charts.', icon: LayoutDashboard, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { id: 'reports', title: 'Report Engine', desc: 'Build custom data visualizations and filtered data tables.', icon: FileText, color: 'text-amber-500', bg: 'bg-amber-50' },
    { id: 'invoices', title: 'Master Ledger', desc: 'View, edit, and export your processed historical invoices.', icon: Database, color: 'text-indigo-500', bg: 'bg-indigo-50' },
    { id: 'inspector', title: 'SQL Inspector', desc: 'Run raw SQL queries directly against your database.', icon: TerminalSquare, color: 'text-rose-500', bg: 'bg-rose-50' },
    { id: 'settings', title: 'System Settings', desc: 'Manage roles, permissions, and organization configurations.', icon: Settings, color: 'text-slate-500', bg: 'bg-slate-50' },
  ];

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-10">
        <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">Welcome to Nika ERP</h2>
        <p className="text-slate-500 mt-2 font-medium text-lg">Select a module below to get started.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {apps.map((app) => {
          const Icon = app.icon;
          return (
            <div 
              key={app.id}
              onClick={() => setActiveTab(app.id)}
              className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer group flex flex-col h-full"
            >
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-5 ${app.bg} group-hover:scale-110 transition-transform duration-300`}>
                <Icon className={`w-7 h-7 ${app.color}`} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors">{app.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed flex-grow">{app.desc}</p>
              
              <div className="mt-5 pt-4 border-t border-slate-100 text-sm font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                Launch Module &rarr;
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};