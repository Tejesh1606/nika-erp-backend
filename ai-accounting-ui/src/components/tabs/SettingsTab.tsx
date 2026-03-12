export const SettingsTab = () => (
  <div className="max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
    <h2 className="text-3xl font-extrabold mb-2">System Settings</h2>
    <p className="text-slate-500 font-semibold mb-8">Manage your organization's permissions and data access.</p>
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
      <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
        <div><h3 className="text-lg font-bold text-slate-800">Role-Based Access Control (RBAC)</h3><p className="text-sm text-slate-500 mt-1">Configure what standard users and admins can do.</p></div>
        <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full flex items-center">Admin Required</span>
      </div>
      <div className="p-6">
        <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg bg-slate-50 opacity-75">
          <div className="flex-1"><h4 className="font-bold text-slate-800 flex items-center">Allow Raw SQL Data Modifications</h4><p className="text-sm text-slate-500 mt-1 pr-6">Allows users with the Admin role to run INSERT, UPDATE, and DELETE queries directly via the SQL Inspector. Highly destructive.</p></div>
          <div className="flex items-center gap-3"><span className="text-xs font-bold text-slate-400 uppercase">Locked</span><div className="w-12 h-6 bg-slate-300 rounded-full flex items-center px-1 cursor-not-allowed"><div className="w-4 h-4 bg-white rounded-full shadow-sm"></div></div></div>
        </div>
        <div className="mt-4 p-4 bg-blue-50 text-blue-800 rounded-lg text-sm font-semibold flex items-start border border-blue-100"><span className="mr-2">ℹ️</span>Role management is currently being configured. Once user roles are deployed, the organization owner will be able to unlock these features for specific team members.</div>
      </div>
    </div>
  </div>
);