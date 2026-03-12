import { UserButton } from "@clerk/clerk-react";
import { Menu, X } from 'lucide-react';

export const MobileHeader = ({ isMobileMenuOpen, setIsMobileMenuOpen }: any) => (
  <div className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center shadow-md z-40 relative">
    <div className="flex items-center gap-3">
      <div className="bg-white rounded-full p-0.5 shadow-sm"><UserButton afterSignOutUrl="/"/></div>
      <h1 className="text-lg font-extrabold tracking-wider">Nika ERP</h1>
    </div>
    <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-300 hover:text-white">
      {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
    </button>
  </div>
);