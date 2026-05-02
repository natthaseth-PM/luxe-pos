"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Search, UserCircle, Dot, CheckCircle2, ListChecks, DollarSign, QrCode, Tag, Coins } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/formatters";

export interface Table {
  id: string;
  name: string;
  capacity: number;
  status: 'available' | 'occupied' | 'calling_bill';
}

export default function CheckoutPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  useEffect(() => {
    const fetchTables = async () => {
      setLoading(true);
      const { data, error } = await supabase.from("tables").select("*").order("name");
      if (!error && data) {
        setTables(data as Table[]);
        // เลือกโต๊ะแรกที่ "เรียกเช็คบิล" หรือ "มีลูกค้า" เป็นค่าเริ่มต้น
        const firstActive = data.find(t => t.status !== 'available');
        if (firstActive) setSelectedTable(firstActive.name);
      }
      setLoading(false);
    };
    fetchTables();
  }, []);

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full text-slate-800">
      
      {/* ======== คอลัมน์ 1: ผังโต๊ะ ======== */}
      <div className="flex-1 flex flex-col gap-6 h-full overflow-hidden">
        <header className="flex flex-col gap-4 shrink-0">
          <div className="flex items-center gap-2.5 p-1.5 bg-white border border-slate-200 rounded-full shadow-sm overflow-x-auto w-fit">
             <FilterPill label="รอชำระเงิน" count={tables.filter(t => t.status === 'calling_bill').length} icon={<DollarSign className="w-4 h-4 text-rose-500" />} isActive />
             <FilterPill label="กำลังทาน" count={tables.filter(t => t.status === 'occupied').length} icon={<Dot className="w-6 h-6 text-amber-500 -ml-1" />} />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto grid grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-4 gap-y-6 pb-10 pr-2 content-start">
          {tables.filter(t => t.status !== 'available').map((table) => (
            <VisualTableItem 
              key={table.id} 
              table={table} 
              isSelected={selectedTable === table.name}
              onClick={() => setSelectedTable(table.name)} 
            />
          ))}
        </div>
      </div>

      {/* ======== คอลัมน์ 2: รายการที่สั่งของโต๊ะที่เลือก ======== */}
      <div className="w-full lg:w-[280px] xl:w-[320px] shrink-0 flex flex-col bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden h-full">
        <div className="p-5 pb-3 flex justify-between items-center bg-slate-50/80 border-b border-slate-100">
          <h2 className="text-lg font-bold">บิล: {selectedTable || '-'}</h2>
          <span className="text-xs font-semibold text-slate-500">จำนวน</span>
        </div>
        
        {/* ข้อมูลจำลอง (Mock Data) เปลี่ยนตามโต๊ะที่เลือก */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {selectedTable ? (
            <>
              <ProductItem name="มอคค่าเย็น" quantity={2} price={100} image="https://cdn-icons-png.flaticon.com/512/1047/1047503.png" />
              <ProductItem name="พายไก่เกลียว" quantity={1} price={95} image="https://cdn-icons-png.flaticon.com/512/2921/2921822.png" />
            </>
          ) : (
            <div className="text-center text-slate-400 mt-10">กรุณาเลือกโต๊ะ</div>
          )}
        </div>
      </div>

      {/* ======== คอลัมน์ 3: ชำระเงิน ======== */}
      <div className="w-full lg:w-[300px] xl:w-[340px] shrink-0 flex flex-col bg-white border border-slate-100 rounded-3xl shadow-sm p-6 gap-6 h-full overflow-y-auto">
        <h2 className="text-xl font-bold tracking-tight">ชำระเงิน {selectedTable && `(${selectedTable})`}</h2>
        
        <div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="ค้นหาสมาชิกด้วยเบอร์โทร..." className="pl-10 rounded-xl bg-slate-50/50 border-slate-200 h-11 text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-2">
          <PaymentButton label="เงินสด (Cash)" icon={<DollarSign className="w-6 h-6 text-sky-500"/>} active />
          <PaymentButton label="โอนเงิน (QR)" icon={<QrCode className="w-6 h-6 text-slate-700"/>} />
        </div>

        <div className="grid grid-cols-2 gap-4 mt-2">
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-2 ml-1">ส่วนลด</p>
            <Input placeholder="฿" className="rounded-xl bg-slate-50/50 border-slate-200 h-11" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-2 ml-1">ใช้แต้ม</p>
            <Input placeholder="แต้ม" className="rounded-xl bg-slate-50/50 border-slate-200 h-11" />
          </div>
        </div>

        <div className="mt-auto bg-[#FFF9ED] p-5 rounded-2xl border border-[#FDEBCE] shadow-sm">
          <p className="text-sm font-semibold text-[#BCA171] text-center mb-1">ยอดสุทธิ (Net Total)</p>
          <p className="text-3xl xl:text-4xl font-extrabold tracking-tight text-[#8A6727] text-center">{selectedTable ? formatCurrency(295) : '฿0.00'}</p>
        </div>
      </div>

    </div>
  );
}

// Sub-components
function VisualTableItem({ table, onClick, isSelected }: { table: Table, onClick: () => void, isSelected: boolean }) {
  const getStatusStyles = (status: Table['status']) => {
    switch (status) {
      case 'available': return { table: "border-sky-200 bg-sky-50", chair: "bg-sky-200", text: "text-slate-700" };
      case 'occupied': return { table: "border-amber-300 bg-amber-50", chair: "bg-amber-300", text: "text-slate-800" };
      case 'calling_bill': return { table: "border-emerald-300 bg-emerald-50", chair: "bg-emerald-300", text: "text-slate-800" };
    }
  };

  const styles = getStatusStyles(table.status);
  const chairs = Array.from({ length: table.capacity <= 6 ? 4 : 6 }, (_, i) => (
    <div key={i} className={`w-4 h-3.5 rounded-sm ${styles.chair}`}></div>
  ));

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`relative flex items-center justify-center p-1.5 rounded-full border-2 transition-all ${isSelected ? 'border-rose-400 scale-110 shadow-lg' : styles.table}`}>
        <motion.div
          whileTap={{ scale: 0.92 }}
          onClick={onClick}
          className={`relative w-20 h-20 rounded-full flex flex-col items-center justify-center shadow-md cursor-pointer transition-colors duration-300 bg-white ${styles.table}`}
        >
          <span className={`text-xl font-bold ${styles.text}`}>{table.name}</span>
        </motion.div>

        <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex gap-2">{chairs.slice(0, 2)}</div>
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-2">{chairs.slice(2, 4)}</div>
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
        <p className="text-xs font-medium text-slate-500">฿{price}</p>
      </div>
      <span className="text-sm font-bold text-slate-900 w-4 text-center">x{quantity}</span>
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