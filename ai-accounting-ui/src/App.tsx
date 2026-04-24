import { Analytics } from "@vercel/analytics/react";
import { SignedIn, SignedOut, SignIn, useAuth } from "@clerk/clerk-react";
import { useState, useEffect, useMemo } from 'react';
import { HomeTab } from './components/tabs/HomeTab';

// Layout
import { Sidebar } from './components/layout/Sidebar';
import { MobileHeader } from './components/layout/MobileHeader';

// Tabs
import { UploadTab } from './components/tabs/UploadTab';
import { DashboardsTab } from './components/tabs/DashboardsTab';
import { ReportsTab } from './components/tabs/ReportsTab';
import { InvoicesTab } from './components/tabs/InvoicesTab';
import { InspectorTab } from './components/tabs/InspectorTab';
import { SettingsTab } from './components/tabs/SettingsTab';

export default function App() {
  const { getToken } = useAuth();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'upload' | 'dashboard' | 'reports' | 'invoices' | 'inspector' | 'settings'>('home');
  
  const [selectedDashId, setSelectedDashId] = useState<string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  
  const [historicData, setHistoricData] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ skip: 0, limit: 50, total_records: 0 });
  const [dashboards, setDashboards] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);

  // Filter/Sort State
  const [filterText, setFilterText] = useState('');
  const [filterField, setFilterField] = useState('all'); 
  const [filterStatus, setFilterStatus] = useState('All');
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

  const [dashSearch, setDashSearch] = useState('');
  const [dashSort, setDashSort] = useState('newest');
  const [reportSearch, setReportSearch] = useState('');
  const [reportSort, setReportSort] = useState('newest');

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
      localStorage.removeItem('reports'); localStorage.removeItem('dashboards');
    }
  }, []);

  const saveConfigs = (newReports: any[], newDashboards: any[]) => {
    setReports(newReports); setDashboards(newDashboards);
    localStorage.setItem('reports', JSON.stringify(newReports));
    localStorage.setItem('dashboards', JSON.stringify(newDashboards));
  };

const fetchHistory = async (skipOffset = 0, limit = 50) => {
    try {
      const token = await getToken(); 
      // Notice the URL now explicitly demands a specific chunk of data
      const res = await fetch(`https://ai-erp-api-gfmt.onrender.com/invoices/?skip=${skipOffset}&limit=${limit}`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      const json = await res.json();
      
      setHistoricData(json.data || []);
      
      // Save the pagination math sent back by the Python server
      if (json.pagination) {
        setPagination(json.pagination);
      }
    } catch (err) { 
      console.error("Fetch failed", err); 
    }
  };
const handlePageChange = (direction: 'next' | 'prev') => {
    let newSkip = pagination.skip;
    
    if (direction === 'next') {
      newSkip += pagination.limit;
    } else if (direction === 'prev') {
      // Prevent negative math if the user clicks previous on page 1
      newSkip = Math.max(0, pagination.skip - pagination.limit);
    }
    
    // Trigger the fetch with the new starting line
    fetchHistory(newSkip, pagination.limit);
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
        else matchesSearch = (inv.vendor_name || '').toLowerCase().includes(searchLower) || (inv.invoice_number || '').toLowerCase().includes(searchLower) || (inv.items || []).some((i: any) => (i.description || '').toLowerCase().includes(searchLower));
      }
      return matchesSearch && (filterStatus === 'All' || inv.status === filterStatus);
    });
    return sortData(filtered, sortConfig);
  }, [historicData, filterText, filterStatus, filterField, sortConfig]);

  const getFlattenedData = (sourceData: any[]) => {
    let flat: any[] = [];
    sourceData.forEach(inv => {
      if (inv.items && inv.items.length > 0) inv.items.forEach((item: any) => { flat.push({ ...inv, item_description: item.description, item_quantity: item.quantity, item_total: item.total_price }); });
      else flat.push({ ...inv, item_description: '-', item_quantity: 0, item_total: 0 });
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

  const handleExportCSV = (exportType: 'invoices' | 'items') => {
    if (filteredHistoricData.length === 0) return alert("No data to export!");
    let csvRows = [];
    if (exportType === 'invoices') {
      csvRows.push(['Date', 'Vendor', 'Invoice Number', 'Status', 'Total Amount'].join(','));
      filteredHistoricData.forEach(row => csvRows.push([row.date || '', `"${(row.vendor_name || '').replace(/"/g, '""')}"`, `"${row.invoice_number || ''}"`, row.status || '', row.amount || 0].join(',')));
    } else {
      csvRows.push(['Invoice Number', 'Vendor', 'Item Description', 'Qty', 'Unit Price', 'Item Total'].join(','));
      filteredHistoricData.forEach(row => {
        if (row.items && row.items.length > 0) {
          row.items.forEach((item: any) => csvRows.push([`"${row.invoice_number || ''}"`, `"${(row.vendor_name || '').replace(/"/g, '""')}"`, `"${(item.description || '').replace(/"/g, '""')}"`, item.quantity || 0, item.unit_price || 0, item.total_price || 0].join(',')));
        }
      });
    }
    const a = document.createElement('a');
    a.href = window.URL.createObjectURL(new Blob([csvRows.join('\n')], { type: 'text/csv' }));
    a.download = `nika_erp_${exportType}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <>
      <SignedOut>
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
          <div className="mb-8 text-center"><h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">AI ERP SYSTEM</h1><p className="text-slate-500 mt-2 font-medium">Sign in to access your secure workspace.</p></div>
          <div className="shadow-2xl rounded-2xl overflow-hidden border border-slate-200"><SignIn routing="hash" /></div>
        </div>
      </SignedOut>

      <SignedIn>
        <div className="min-h-screen flex flex-col md:flex-row bg-slate-100 text-slate-900 font-sans">
          
          <MobileHeader isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
          
          <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} setSelectedDashId={setSelectedDashId} setSelectedReportId={setSelectedReportId} isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />

          <div className="flex-1 p-4 md:p-10 overflow-auto h-[calc(100vh-72px)] md:h-screen w-full relative">
            
            {activeTab === 'home' && <HomeTab setActiveTab={setActiveTab} />}
            
            {activeTab === 'upload' && <UploadTab getToken={getToken} fetchHistory={fetchHistory} />}
            
            {activeTab === 'dashboard' && <DashboardsTab selectedDashId={selectedDashId} setSelectedDashId={setSelectedDashId} dashSearch={dashSearch} setDashSearch={setDashSearch} dashSort={dashSort} setDashSort={setDashSort} dashboards={dashboards} reports={reports} saveConfigs={saveConfigs} setActiveTab={setActiveTab} setSelectedReportId={setSelectedReportId} processChartData={processChartData} filterText={filterText} setFilterText={setFilterText} filterField={filterField} setFilterField={setFilterField} filterStatus={filterStatus} setFilterStatus={setFilterStatus} />}

            {activeTab === 'reports' && <ReportsTab selectedReportId={selectedReportId} setSelectedReportId={setSelectedReportId} reports={reports} dashboards={dashboards} saveConfigs={saveConfigs} reportSearch={reportSearch} setReportSearch={setReportSearch} reportSort={reportSort} setReportSort={setReportSort} filteredHistoricData={filteredHistoricData} sortConfig={sortConfig} handleSort={handleSort} getFlattenedData={getFlattenedData} processChartData={processChartData} sortData={sortData} filterText={filterText} setFilterText={setFilterText} filterField={filterField} setFilterField={setFilterField} filterStatus={filterStatus} setFilterStatus={setFilterStatus} />}
            
            {activeTab === 'invoices' && <InvoicesTab 
              filteredHistoricData={filteredHistoricData} 
              handleExportCSV={handleExportCSV} 
              getToken={getToken} 
              fetchHistory={fetchHistory} 
              filterText={filterText} 
              setFilterText={setFilterText} 
              filterField={filterField} 
              setFilterField={setFilterField} 
              filterStatus={filterStatus} 
              setFilterStatus={setFilterStatus} 
              sortConfig={sortConfig} 
              handleSort={handleSort} 
              pagination={pagination} 
              handlePageChange={handlePageChange} 
            />}
            
            {activeTab === 'inspector' && <InspectorTab getToken={getToken} />}
            
            {activeTab === 'settings' && <SettingsTab />}
          </div>
        </div>
      </SignedIn>
      <Analytics />
    </>
  );
}