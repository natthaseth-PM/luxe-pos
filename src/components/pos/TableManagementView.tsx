"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Search, UserCircle, Dot, CheckCircle2, ListChecks, DollarSign, QrCode } from "lucide-react";
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
    <div className="grid grid-cols-1 md:grid-cols-[2fr,1.3fr] xl:grid-cols-[1.8fr,1fr] gap-6 h-full text-slate-800">
      {/* ======== ฝั่งซ้าย: ผังโต๊ะ ======== */}
      <div className="h-full flex flex-col gap-6">
        <header className="flex flex-col gap-4">
          <h1 className="text-3xl font-bold tracking-tight text-slate-800">ผังโต๊ะอาหาร</h1>
          
          <div className="flex items-center gap-2.5 p-1.5 bg-white border border-white/40 rounded-full shadow-inner shadow-black/5 overflow-x-auto">
            <FilterPill label="ทั้งหมด" count={tables.length} icon={<ListChecks className="w-4 h-4 text-slate-500"/>} isActive />
            <FilterPill label="ว่าง" count={tables.filter(t => t.status === 'available').length} icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />} />
            <FilterPill label="มีลูกค้า" count={tables.filter(t => t.status === 'occupied').length} icon={<UserCircle className="w-4 h-4 text-amber-500" />} />
            <FilterPill label="รอเช็คบิล" count={tables.filter(t => t.status === 'calling_bill').length} icon={<DollarSign className="w-4 h-4 text-rose-500" />} />
            <FilterPill label="จ่ายแล้ว" count={0} icon={<Dot className="w-4 h-4 text-slate-400"/>} />
          </div>
        </header>

        <AnimatePresence>
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-slate-400">กำลังโหลดข้อมูล...</div>
          ) : tables.length === 0 ? (
             <div className="flex-1 flex items-center justify-center text-slate-400">ยังไม่มีข้อมูลโต๊ะ กรุณาเพิ่มข้อมูลใน Supabase (หรืออย่าลืมปิด RLS นะครับ!)</div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 overflow-auto grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-6 gap-y-10 py-6"
            >
              {tables.map((table) => (
                <VisualTableItem key={table.id} table={table} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ======== ฝั่งขวา: รายการสั่งอาหาร & ชำระเงิน ======== */}
      <div className="flex flex-col gap-6">
        
        {/* รายการอาหารในออเดอร์ปัจจุบัน */}
        <div className="flex-1 p-6 bg-white border border-white/60 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.03)] overflow-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">รายการอาหาร</h2>
            <h3 className="text-sm font-medium text-slate-400">จำนวน</h3>
          </div>
          <div className="space-y-4">
            <ProductItem name="มอคค่าเย็น" quantity={2} price={100} image="https://cdn-icons-png.flaticon.com/512/1047/1047503.png" />
            <ProductItem name="คาปูชิโน่" quantity={3} price={120} image="https://cdn-icons-png.flaticon.com/512/1047/1047503.png" />
            <ProductItem name="พายไก่เกลียว" quantity={1} price={95} image="https://cdn-icons-png.flaticon.com/512/2921/2921822.png" />
            <ProductItem name="กาแฟดำน้ำผึ้ง" quantity={2} price={90} image="https://cdn-icons-png.flaticon.com/512/1047/1047503.png" />
          </div>
        </div>

        {/* ส่วนชำระเงิน */}
        <div className="p-6 bg-white border border-white/60 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex flex-col gap-6">
          <h2 className="text-2xl font-bold tracking-tight">ชำระเงิน</h2>
          
          {/* วิธีแก้ Error Input: ใช้ div ครอบแทนการส่ง prop icon */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="ค้นหาสมาชิกด้วยเบอร์โทรศัพท์" className="pl-10 rounded-full bg-slate-50 border-slate-100 h-11" />
          </div>
          
          <div className="flex items-center gap-4 p-4 border border-slate-100 bg-slate-50 rounded-2xl">
            <UserCircle className="w-12 h-12 text-slate-300" />
            <div>
              <p className="font-semibold text-slate-700">สมาชิก: คุณสมชาย ใจดี</p>
              <p className="text-sm text-slate-500">ระดับ: Gold | แต้มสะสม: 1,200</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <PaymentButton label="เงินสด (Cash)" icon={<DollarSign className="w-5 h-5 text-emerald-500"/>} active />
            <PaymentButton label="สแกนจ่าย (QR)" icon={<QrCode className="w-5 h-5 text-sky-500"/>} />
          </div>

          <div className="bg-[#FAF7F0] p-6 rounded-2xl border border-[#EEE7DA]">
            <p className="text-sm font-medium text-[#C0A878]">ยอดสุทธิ (Net Total)</p>
            <p className="text-4xl font-bold tracking-tight text-[#8B6E3F]">{formatCurrency(1250)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-components ...
function VisualTableItem({ table }: { table: Table }) {
  const getStatusStyles = (status: Table['status']) => {
    switch (status) {
      case 'available': return { table: "border-emerald-300 bg-white shadow-emerald-500/5", chair: "bg-emerald-300", text: "text-slate-800" };
      case 'occupied': return { table: "border-amber-400 bg-amber-100/50 shadow-amber-500/5", chair: "bg-amber-400", text: "text-slate-800" };
      case 'calling_bill': return { table: "border-rose-300 bg-rose-50 shadow-rose-500/5", chair: "bg-rose-300", text: "text-slate-800" };
    }
  };

  const styles = getStatusStyles(table.status);
  const chairs = Array.from({ length: table.capacity <= 6 ? 4 : 6 }, (_, i) => (
    <div key={i} className={`w-3.5 h-6 rounded ${styles.chair}`}></div>
  ));

  return (
    <div className="flex flex-col items-center gap-3">
      <div className={`relative flex items-center justify-center p-2 rounded-full border-2 shadow-inner ${styles.table}`}>
        <motion.div
          whileTap={{ scale: 0.92 }}
          className={`relative w-24 h-24 rounded-full flex flex-col items-center justify-center shadow-xl cursor-pointer transition-colors duration-300 ${styles.table}`}
        >
          <div className="absolute top-2.5 right-2.5">
            {table.status === 'occupied' && <UserCircle className="w-4 h-4 text-amber-500" />}
            {table.status === 'available' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          </div>
          <span className={`text-2xl font-extrabold tracking-tight ${styles.text}`}>{table.name}</span>
        </motion.div>

        <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex gap-1.5">{chairs.slice(0, 2)}</div>
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">{chairs.slice(2, 4)}</div>
        {table.capacity > 6 && (
          <>
            <div className="absolute top-1/2 left-0 -translate-y-1/2 flex flex-col gap-1.5 -translate-x-3">{chairs.slice(4, 5)}</div>
            <div className="absolute top-1/2 right-0 -translate-y-1/2 flex flex-col gap-1.5 translate-x-3">{chairs.slice(5, 6)}</div>
          </>
        )}
      </div>
      <p className="text-xs font-semibold text-slate-500">{table.capacity} ที่นั่ง</p>
    </div>
  );
}

function FilterPill({ label, count, icon, isActive = false }: { label: string; count: number; icon: React.ReactNode; isActive?: boolean }) {
  return (
    <Badge variant="ghost" className={`flex items-center gap-2 px-4 py-2.5 rounded-full whitespace-nowrap ${isActive ? "bg-amber-100 text-amber-900 border border-amber-200 shadow-sm" : "text-slate-600"}`}>
      {icon}
      <span className="text-sm font-semibold">{label}</span>
      <span className="text-sm font-semibold opacity-60">({count})</span>
    </Badge>
  );
}

function ProductItem({ name, quantity, price, image }: { name: string; quantity: number; price: number; image: string }) {
  return (
    <div className="flex items-center gap-4 py-2">
      <div className="w-14 h-14 p-1.5 border border-slate-100 rounded-2xl bg-slate-50 shadow-inner flex items-center justify-center">
        <img src={image} alt={name} className="w-full h-full object-contain" />
      </div>
      <div className="flex-1">
        <p className="font-semibold text-slate-800">{name}</p>
        <p className="text-sm text-slate-500">{formatCurrency(price)} / ชิ้น</p>
      </div>
      <p className="text-lg font-bold text-slate-900 w-12 text-center">{quantity}</p>
    </div>
  );
}

function PaymentButton({ label, icon, active = false }: { label: string; icon: React.ReactNode; active?: boolean }) {
  return (
    <button className={`w-full aspect-square flex flex-col items-center justify-center p-4 gap-3 rounded-2xl border transition-all ${active ? "bg-amber-500 border-amber-500 text-white shadow-xl shadow-amber-500/10" : "bg-slate-50 border-slate-100 text-slate-700 hover:bg-slate-100"}`}>
      <div className={`p-3 rounded-full ${active ? "bg-white/20" : "bg-slate-200"}`}>{icon}</div>
      <span className="font-semibold text-center">{label}</span>
    </button>
  );
}