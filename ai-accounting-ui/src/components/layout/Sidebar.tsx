import { UserButton } from "@clerk/clerk-react";
import { UploadCloud, LayoutDashboard, FileText, Database, Settings, X } from 'lucide-react';

export const Sidebar = ({ activeTab, setActiveTab, setSelectedDashId, setSelectedReportId, isMobileMenuOpen, setIsMobileMenuOpen }: any) => {
  
  const navTo = (tab: string) => {
    setActiveTab(tab);
    setSelectedDashId(null);
    setSelectedReportId(null);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {isMobileMenuOpen && (<div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)}/>)}
      <div className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-slate-900 text-slate-300 flex flex-col p-4 shadow-xl shrink-0 z-50 transform transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="flex justify-between items-center mb-8 pl-4 pt-4">
          <div className="flex items-center gap-3 hidden md:flex">
            <div className="bg-white rounded-full p-0.5 shadow-sm"><UserButton afterSignOutUrl="/"/></div>
            <h1 className="text-lg font-extrabold text-white tracking-wider">Nika ERP</h1>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden p-2 text-slate-400 hover:text-white"><X className="w-6 h-6" /></button>
        </div>
        <nav className="flex flex-col gap-2">
          <button onClick={() => navTo('upload')} className={`flex items-center px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'upload' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}><UploadCloud className="w-5 h-5 mr-3"/> Upload</button>
          <button onClick={() => navTo('dashboard')} className={`flex items-center px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}><LayoutDashboard className="w-5 h-5 mr-3"/> Dashboards</button>
          <button onClick={() => navTo('reports')} className={`flex items-center px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'reports' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}><FileText className="w-5 h-5 mr-3"/> Reports</button>
          <button onClick={() => navTo('invoices')} className={`flex items-center px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'invoices' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}><Database className="w-5 h-5 mr-3"/> Ledger</button>
          <button onClick={() => navTo('inspector')} className={`flex items-center px-4 py-3 rounded-xl font-bold transition-all mt-4 border-t border-slate-700 pt-6 ${activeTab === 'inspector' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}><Database className="w-5 h-5 mr-3 text-green-400"/> SQL Inspector</button>
          <button onClick={() => navTo('settings')} className={`flex items-center px-4 py-3 rounded-xl font-bold transition-all mt-2 ${activeTab === 'settings' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}><Settings className="w-5 h-5 mr-3 text-slate-400"/> Settings</button>
        </nav>
      </div>
    </>
  );
};