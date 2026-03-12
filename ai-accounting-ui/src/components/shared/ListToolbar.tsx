import { Search, SortDesc } from 'lucide-react';

export const ListToolbar = ({ search, setSearch, sort, setSort, placeholder }: any) => (
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