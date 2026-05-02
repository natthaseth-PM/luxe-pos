"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Search, UserCircle, Dot, CheckCircle2, ListChecks, DollarSign, QrCode, Tag, Coins, Minus, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/formatters";

export interface Table {
  id: string;
  name: string;
  capacity: number;
  status: 'available' | 'occupied' | 'calling_bill';
}

export default function TableManagementView() {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTables = async () => {
      setLoading(true);
      const { data, error } = await supabase.from("tables").select("*").order("name");
      if (!error && data) {
        setTables(data as Table[]);
      }
      setLoading(false);
    };
    fetchTables();

    const channel = supabase.channel('table-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, fetchTables)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    // ปรับเปลี่ยน Breakpoint เป็น lg (1024px) สำหรับ iPad แนวนอน
    <div className="flex flex-col lg:flex-row gap-6 h-full text-slate-800">
      
      {/* ======== คอลัมน์ 1: ผังโต๊ะ ======== */}
      <div className="flex-1 flex flex-col gap-6 h-full overflow-hidden">
        <header className="flex flex-col gap-4 shrink-0">
          <h1 className="text-3xl font-bold tracking-tight text-slate-800">ผังโต๊ะอาหาร</h1>
          
          <div className="flex items-center gap-2.5 p-1.5 bg-white border border-slate-200 rounded-full shadow-sm overflow-x-auto w-fit">
            <FilterPill label="ทั้งหมด" count={tables.length} icon={<ListChecks className="w-4 h-4 text-slate-500"/>} isActive />
            <FilterPill label="ว่าง" count={tables.filter(t => t.status === 'available').length} icon={<CheckCircle2 className="w-4 h-4 text-sky-500" />} />
            <FilterPill label="มีลูกค้า" count={tables.filter(t => t.status === 'occupied').length} icon={<Dot className="w-6 h-6 text-amber-500 -ml-1" />} />
            <FilterPill label="จ่ายแล้ว" count={2} icon={<Dot className="w-6 h-6 text-emerald-400 -ml-1"/>} />
          </div>
        </header>

        <AnimatePresence>
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-slate-400">กำลังโหลดข้อมูล...</div>
          ) : tables.length === 0 ? (
             <div className="flex-1 flex items-center justify-center text-slate-400">ไม่พบข้อมูลโต๊ะ</div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              // เพิ่ม content-start เพื่อให้โต๊ะจัดเรียงชิดด้านบนเสมอ ไม่ยืดห่างกัน
              className="flex-1 overflow-y-auto grid grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-4 gap-y-6 pb-10 pr-2 content-start"
            >
              {tables.map((table) => (
                <VisualTableItem key={table.id} table={table} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ======== คอลัมน์ 2: รายการอาหาร (กว้างให้พอดีกับ iPad/PC) ======== */}
      <div className="w-full lg:w-[280px] xl:w-[320px] shrink-0 flex flex-col bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden h-full">
        <div className="p-5 pb-3 flex justify-between items-center bg-slate-50/80 border-b border-slate-100">
          <h2 className="text-lg font-bold">รายการอาหาร</h2>
          <span className="text-xs font-semibold text-slate-500 bg-white px-3 py-1.5 rounded-full shadow-sm border border-slate-100">จำนวน</span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <ProductItem name="มอคค่าเย็น" quantity={2} price={100} image="https://cdn-icons-png.flaticon.com/512/1047/1047503.png" />
          <ProductItem name="คาปูชิโน่" quantity={3} price={120} image="https://cdn-icons-png.flaticon.com/512/1047/1047503.png" />
          <ProductItem name="พายไก่เกลียว" quantity={1} price={95} image="https://cdn-icons-png.flaticon.com/512/2921/2921822.png" />
          <ProductItem name="กาแฟดำน้ำผึ้ง" quantity={2} price={90} image="https://cdn-icons-png.flaticon.com/512/1047/1047503.png" />
          <ProductItem name="ชาเขียวมัทฉะ" quantity={1} price={85} image="https://cdn-icons-png.flaticon.com/512/1047/1047503.png" />
        </div>
      </div>

      {/* ======== คอลัมน์ 3: ชำระเงิน ======== */}
      <div className="w-full lg:w-[300px] xl:w-[340px] shrink-0 flex flex-col bg-white border border-slate-100 rounded-3xl shadow-sm p-6 gap-6 h-full overflow-y-auto">
        <h2 className="text-2xl font-bold tracking-tight">ชำระเงิน</h2>
        
        <div>
          <p className="text-xs font-semibold text-slate-500 mb-2 ml-1">ค้นหาสมาชิก</p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="กรอกเบอร์โทรศัพท์..." className="pl-10 rounded-xl bg-slate-50/50 border-slate-200 h-11 text-sm" />
          </div>
        </div>
        
        <div className="flex items-center justify-between p-4 border border-slate-100 bg-slate-50/80 rounded-2xl">
          <div className="flex items-center gap-3">
            <UserCircle className="w-10 h-10 text-slate-400" />
            <div>
              <p className="font-bold text-sm text-slate-800">คุณลินิน</p>
              <p className="text-xs text-slate-500">แต้มสะสม: 0</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-bold text-sm text-slate-800">฿500</p>
            <p className="text-[10px] text-slate-500 uppercase font-semibold">ระดับ</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-2">
          <PaymentButton label="เงินสด (Cash)" icon={<DollarSign className="w-6 h-6 text-sky-500"/>} active />
          <PaymentButton label="โอนเงิน (QR)" icon={<QrCode className="w-6 h-6 text-slate-700"/>} />
        </div>

        <div className="grid grid-cols-2 gap-4 mt-2">
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-2 ml-1">ส่วนลด</p>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder=" " className="pl-9 rounded-xl bg-slate-50/50 border-slate-200 h-11" />
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-2 ml-1">ใช้แต้มสะสม</p>
            <div className="relative">
              <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder=" " className="pl-9 rounded-xl bg-slate-50/50 border-slate-200 h-11" />
            </div>
          </div>
        </div>

        <div className="mt-auto bg-[#FFF9ED] p-5 rounded-2xl border border-[#FDEBCE] shadow-sm">
          <p className="text-sm font-semibold text-[#BCA171] text-center mb-1">ยอดสุทธิ (Net Total)</p>
          <p className="text-3xl xl:text-4xl font-extrabold tracking-tight text-[#8A6727] text-center">{formatCurrency(2450)}</p>
        </div>
      </div>

    </div>
  );
}

// Sub-components
function VisualTableItem({ table }: { table: Table }) {
  const getStatusStyles = (status: Table['status']) => {
    switch (status) {
      case 'available': return { table: "border-sky-200 bg-sky-50 shadow-sky-500/5", chair: "bg-sky-200", text: "text-slate-700" };
      case 'occupied': return { table: "border-amber-300 bg-amber-50 shadow-amber-500/5", chair: "bg-amber-300", text: "text-slate-800" };
      case 'calling_bill': return { table: "border-emerald-300 bg-emerald-50 shadow-emerald-500/5", chair: "bg-emerald-300", text: "text-slate-800" };
    }
  };

  const styles = getStatusStyles(table.status);
  const chairs = Array.from({ length: table.capacity <= 6 ? 4 : 6 }, (_, i) => (
    <div key={i} className={`w-4 h-3.5 rounded-sm ${styles.chair}`}></div>
  ));

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`relative flex items-center justify-center p-1.5 rounded-full border-2 ${styles.table}`}>
        <motion.div
          whileTap={{ scale: 0.92 }}
          className={`relative w-20 h-20 rounded-full flex flex-col items-center justify-center shadow-md cursor-pointer transition-colors duration-300 bg-white ${styles.table}`}
        >
          <span className={`text-xl font-bold ${styles.text}`}>{table.name}</span>
        </motion.div>

        <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex gap-2">{chairs.slice(0, 2)}</div>
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-2">{chairs.slice(2, 4)}</div>
        {table.capacity > 6 && (
          <>
            <div className="absolute top-1/2 -left-2 -translate-y-1/2 flex flex-col gap-2">{chairs.slice(4, 5)}</div>
            <div className="absolute top-1/2 -right-2 -translate-y-1/2 flex flex-col gap-2">{chairs.slice(5, 6)}</div>
          </>
        )}
      </div>
    </div>
  );
}

function FilterPill({ label, count, icon, isActive = false }: { label: string; count: number; icon: React.ReactNode; isActive?: boolean }) {
  return (
    <Badge variant="ghost" className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full whitespace-nowrap ${isActive ? "bg-slate-100 text-slate-800 shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}>
      {icon}
      <span className="text-sm font-semibold">{label}</span>
      <span className="text-sm font-medium opacity-60">({count})</span>
    </Badge>
  );
}

function ProductItem({ name, quantity, price, image }: { name: string; quantity: number; price: number; image: string }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
      <div className="w-12 h-12 p-1.5 border border-slate-100 rounded-xl bg-slate-50 shadow-inner flex shrink-0 items-center justify-center">
        <img src={image} alt={name} className="w-full h-full object-contain" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-slate-800 text-sm truncate">{name}</p>
        <p className="text-xs font-medium text-slate-500">฿{price} / ชิ้น</p>
      </div>
      
      <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-100 shrink-0">
        <button className="w-6 h-6 flex items-center justify-center bg-white rounded shadow-sm text-slate-600 hover:text-rose-500 transition-colors">
          <Minus className="w-3 h-3" />
        </button>
        <span className="text-sm font-bold text-slate-900 w-4 text-center">{quantity}</span>
        <button className="w-6 h-6 flex items-center justify-center bg-white rounded shadow-sm text-slate-600 hover:text-emerald-500 transition-colors">
          <Plus className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

function PaymentButton({ label, icon, active = false }: { label: string; icon: React.ReactNode; active?: boolean }) {
  return (
    <button className={`w-full aspect-[4/3] flex flex-col items-center justify-center p-4 gap-2.5 rounded-2xl border transition-all ${active ? "bg-[#E6F3FE] border-sky-200 text-slate-800 shadow-md shadow-sky-500/10" : "bg-[#FAF7F0] border-[#EEE7DA] text-slate-700 hover:bg-[#FDEBCE]"}`}>
      <div className="p-2 bg-white rounded-full shadow-sm">{icon}</div>
      <span className="font-bold text-sm">{label}</span>
    </button>
  );
}