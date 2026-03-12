import { Filter, Search } from 'lucide-react';

export const DataFilterBar = ({ filterText, setFilterText, filterField, setFilterField, filterStatus, setFilterStatus }: any) => (
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