import React from "react";
import Link from "next/link";
import { LayoutGrid, UtensilsCrossed, Receipt, Settings, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PosLayout({ children }: { children: React.ReactNode }) {
  return (
    // พื้นหลังหลัก: ใช้สีเทาอ่อนอมอุ่นๆ หรือภาพพื้นหลังจางๆ เพื่อขับความโดดเด่นของ Glassmorphism
    <div className="flex h-screen w-full bg-[#F8F9FA] overflow-hidden text-slate-800">
      
      {/* Sidebar (Navigation)
        Design: Glassmorphism (กึ่งโปร่งใส + เบลอพื้นหลัง) + เงาอ่อนๆ ให้ดูมีมิติ
      */}
      <aside className="w-[100px] flex flex-col items-center py-6 bg-white/60 backdrop-blur-xl border-r border-white/40 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10">
        {/* Logo Area */}
        <div className="mb-10">
          <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
            <UtensilsCrossed className="text-white w-7 h-7" />
          </div>
        </div>

        {/* Menu Icons (Touch-friendly: พื้นที่กดใหญ่อย่างน้อย 48x48px) */}
        <nav className="flex-1 flex flex-col gap-6 w-full px-4">
          <NavButton icon={<LayoutGrid className="w-6 h-6" />} isActive label="Tables" />
          <NavButton icon={<UtensilsCrossed className="w-6 h-6" />} label="Menu" />
          <NavButton icon={<Receipt className="w-6 h-6" />} label="Orders" />
        </nav>

        {/* Bottom Actions */}
        <div className="mt-auto">
          <Button variant="ghost" size="icon" className="w-14 h-14 rounded-xl hover:bg-white/80">
            <Settings className="w-6 h-6 text-slate-400" />
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full relative">
        
        {/* Topbar
          Design: Glassmorphism แนวนอน
        */}
        <header className="h-[80px] w-full flex items-center justify-between px-8 bg-white/40 backdrop-blur-md border-b border-white/40 z-10 sticky top-0">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-semibold tracking-tight">Table Management</h1>
            <span className="px-3 py-1 bg-amber-100 text-amber-700 text-sm font-medium rounded-full">
              Lunch Shift
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" className="rounded-full w-12 h-12 bg-white/50 border-white/60 shadow-sm relative">
              <Bell className="w-5 h-5 text-slate-600" />
              <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
            </Button>
            
            <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
              <div className="w-12 h-12 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden">
                <img src="https://i.pravatar.cc/150?img=11" alt="User" className="w-full h-full object-cover" />
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-slate-700">Jane Cooper</p>
                <p className="text-xs text-slate-400">Cashier</p>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <div className="flex-1 overflow-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

// Sub-component สำหรับปุ่ม Navigation
function NavButton({ icon, isActive = false, label }: { icon: React.ReactNode; isActive?: boolean; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <Button
        variant={isActive ? "default" : "ghost"}
        size="icon"
        className={`w-16 h-16 rounded-2xl transition-all duration-300 ${
          isActive 
            ? "bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/30 text-white" 
            : "text-slate-400 hover:bg-white/80 hover:text-slate-700"
        }`}
      >
        {icon}
      </Button>
      {/* เพิ่ม Label เล็กๆ ให้ชัดเจนขึ้นสำหรับ User */}
      <span className={`text-[10px] font-medium ${isActive ? "text-amber-600" : "text-slate-400"}`}>
        {label}
      </span>
    </div>
  );
}