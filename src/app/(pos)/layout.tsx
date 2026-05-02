"use client"; // จำเป็นสำหรับการใช้ usePathname และ Toaster

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, UtensilsCrossed, Receipt, Settings, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster } from "sonner"; // เพิ่มการแจ้งเตือน sonner

export default function PosLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // ฟังก์ชันเปลี่ยนชื่อหน้าต่างตาม URL
  const getPageTitle = () => {
    if (pathname.includes('/menu')) return "สั่งอาหาร (Menu)";
    if (pathname.includes('/checkout')) return "การชำระเงิน (Checkout)";
    return "ภาพรวมโต๊ะ (Table Overview)";
  };

  return (
    <div className="flex h-screen w-full bg-[#F8F9FA] overflow-hidden text-slate-800">
      {/* เพิ่ม Toaster สำหรับแสดงผล Notification มุมขวาบน */}
      <Toaster position="top-right" richColors />

      {/* Sidebar (Navigation)
        Design: Glassmorphism (กึ่งโปร่งใส + เบลอพื้นหลัง) + เงาอ่อนๆ ให้ดูมีมิติ
      */}
      <aside className="w-[100px] shrink-0 flex flex-col items-center py-6 bg-white/60 backdrop-blur-xl border-r border-white/40 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10">
        {/* Logo Area */}
        <div className="mb-10">
          <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
            <UtensilsCrossed className="text-white w-7 h-7" />
          </div>
        </div>

        {/* Menu Icons (Touch-friendly: พื้นที่กดใหญ่อย่างน้อย 48x48px) */}
        <nav className="flex-1 flex flex-col gap-6 w-full px-4">
          <NavButton href="/" icon={<LayoutGrid className="w-6 h-6" />} label="ผังโต๊ะ" />
          <NavButton href="/menu" icon={<UtensilsCrossed className="w-6 h-6" />} label="เมนู" />
          <NavButton href="/checkout" icon={<Receipt className="w-6 h-6" />} label="ชำระเงิน" />
        </nav>

        {/* Bottom Actions */}
        <div className="mt-auto">
          <Button variant="ghost" size="icon" className="w-14 h-14 rounded-xl hover:bg-white/80">
            <Settings className="w-6 h-6 text-slate-400" />
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* Topbar
          Design: Glassmorphism แนวนอน
        */}
        <header className="h-[80px] shrink-0 w-full flex items-center justify-between px-8 bg-white/40 backdrop-blur-md border-b border-white/40 z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold tracking-tight text-slate-800">{getPageTitle()}</h1>
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
              <div className="w-12 h-12 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center">
                <span className="text-xl font-bold text-slate-500">JC</span>
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-slate-700">Jane Cooper</p>
                <p className="text-xs text-slate-400">Cashier</p>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <div className="flex-1 overflow-hidden p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

// Sub-component สำหรับปุ่ม Navigation
function NavButton({ icon, href, label }: { icon: React.ReactNode; href: string; label: string }) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <Link href={href} className="flex flex-col items-center gap-1 w-full">
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
      <span className={`text-sm font-semibold tracking-wide mt-1 ${isActive ? "text-amber-600" : "text-slate-500"}`}>
        {label}
      </span>
    </Link>
  );
}