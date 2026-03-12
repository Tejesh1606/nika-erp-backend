import React, { useState } from 'react';
import { Download, ChevronDown, X, Save, ArrowUp, ArrowDown } from 'lucide-react';
import { DataFilterBar } from '../shared/DataFilterBar';

export const InvoicesTab = ({ 
  filteredHistoricData, 
  handleExportCSV, 
  getToken, 
  fetchHistory,
  filterText, setFilterText,
  filterField, setFilterField,
  filterStatus, setFilterStatus,
  sortConfig, handleSort
}: any) => {
  // WE MOVED THIS STATE OUT OF APP.TSX!
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>(null);

  const handleItemChange = (index: number, field: string, value: string) => {
    const newItems = [...editForm.items];
    newItems[index][field] = value;
    if (field === 'quantity' || field === 'unit_price') {
       newItems[index].total_price = (parseFloat(newItems[index].quantity || 0) * parseFloat(newItems[index].unit_price || 0)).toFixed(2);
    }
    setEditForm({...editForm, items: newItems});
  };

  const SortableHeader = ({ label, sortKey }: { label: string, sortKey: string }) => (
    <th className="px-4 py-3 cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => handleSort(sortKey)}>
      <div className="flex items-center">
        {label}
        {sortConfig.key === sortKey && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 ml-1 text-blue-600"/> : <ArrowDown className="w-3 h-3 ml-1 text-blue-600"/>)}
      </div>
    </th>
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <DataFilterBar filterText={filterText} setFilterText={setFilterText} filterField={filterField} setFilterField={setFilterField} filterStatus={filterStatus} setFilterStatus={setFilterStatus} />
      
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="p-5 bg-slate-50 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">Master Editable Ledger</h2>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-500 bg-slate-200 px-3 py-1 rounded-full hidden sm:inline-block">{filteredHistoricData.length} records</span>
            
            <button 
              onClick={() => handleExportCSV('invoices')}
              className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-lg font-bold text-sm shadow-sm flex items-center transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Invoices
            </button>
            <button 
              onClick={() => handleExportCSV('items')}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg font-bold text-sm shadow-sm flex items-center transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Items
            </button>
          </div>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase text-slate-500 border-b">
            <tr><SortableHeader label="Date" sortKey="date"/><SortableHeader label="Vendor" sortKey="vendor_name"/><SortableHeader label="Invoice #" sortKey="invoice_number"/><SortableHeader label="Status" sortKey="status"/><SortableHeader label="Amount" sortKey="amount"/><th className="p-4"></th></tr>
          </thead>
          <tbody>
            {filteredHistoricData.map((inv: any) => (
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
                              const token = await getToken(); 
                              const res = await fetch(`https://ai-erp-api-gfmt.onrender.com/invoices/${editForm.id}`, { 
                                method: 'PUT', 
                                headers: { 
                                  'Content-Type': 'application/json',
                                  'Authorization': `Bearer ${token}` 
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