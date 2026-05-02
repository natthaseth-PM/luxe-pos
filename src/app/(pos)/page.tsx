"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { UserCircle, Dot, CheckCircle2, ListChecks } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

export interface Table { id: string; name: string; capacity: number; status: 'available' | 'occupied' | 'calling_bill'; }

export default function PosHomePage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchTables = async () => {
      setLoading(true);
      const { data, error } = await supabase.from("tables").select("*").order("name");
      if (!error && data) setTables(data as Table[]);
      setLoading(false);
    };
    fetchTables();

    const channel = supabase.channel('table-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, fetchTables)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="flex flex-col gap-8 h-full text-slate-800">
      <header className="flex flex-col gap-4 shrink-0">
        <div className="flex items-center gap-3 p-2 bg-white border border-slate-200 rounded-full shadow-md w-fit">
          <FilterPill label="ทั้งหมด" count={tables.length} icon={<ListChecks className="w-4 h-4 text-slate-500"/>} isActive />
          <FilterPill label="ว่าง (สีเขียว)" count={tables.filter(t => t.status === 'available').length} icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />} />
          <FilterPill label="มีลูกค้า (สีแดง)" count={tables.filter(t => t.status === 'occupied').length} icon={<Dot className="w-6 h-6 text-rose-500 -ml-1" />} />
        </div>
      </header>

      <AnimatePresence>
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 font-bold">กำลังตรวจสอบสถานะโต๊ะ...</div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-x-6 gap-y-12 pb-20 content-start px-2"
          >
            {tables.map((table) => (
              <VisualTableItem 
                key={table.id} 
                table={table} 
                onClick={() => {
                  if (table.status === 'available') router.push(`/menu?table=${encodeURIComponent(table.name)}`);
                }} 
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function VisualTableItem({ table, onClick }: { table: Table, onClick: () => void }) {
  const getStatusStyles = (status: Table['status']) => {
    switch (status) {
      case 'available': return { ring: "border-emerald-500 bg-emerald-50", circle: "text-emerald-800 shadow-emerald-500/50", chair: "bg-emerald-600" };
      case 'occupied': return { ring: "border-rose-600 bg-rose-50", circle: "text-rose-800 shadow-rose-600/50", chair: "bg-rose-700" };
      case 'calling_bill': return { ring: "border-amber-500 bg-amber-50", circle: "text-amber-800 shadow-amber-500/50", chair: "bg-amber-600" };
    }
  };

  const styles = getStatusStyles(table.status);
  const isAvailable = table.status === 'available';
  const chairs = Array.from({ length: table.capacity <= 6 ? 4 : 6 }, (_, i) => (
    <div key={i} className={`w-4 h-4 rounded-md shadow-sm ${styles.chair}`}></div>
  ));

  return (
    <div className={`flex flex-col items-center gap-3 transition-all duration-300 ${!isAvailable && 'opacity-90'}`}>
      <div className={`relative flex items-center justify-center p-2.5 rounded-full border-[4px] ${styles.ring} shadow-2xl`}>
        <motion.div
          whileTap={isAvailable ? { scale: 0.92 } : {}}
          onClick={onClick}
          className={`relative w-24 h-24 rounded-full flex flex-col items-center justify-center bg-white shadow-xl transition-all duration-300 ${styles.circle} ${isAvailable ? 'cursor-pointer hover:scale-110 hover:shadow-2xl' : 'cursor-not-allowed'}`}
        >
          <span className="text-3xl font-black tracking-tighter">{table.name}</span>
          {!isAvailable && <UserCircle className="w-6 h-6 absolute top-2 right-2 opacity-50" />}
        </motion.div>

        {/* ตกแต่งเก้าอี้ */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex gap-2.5">{chairs.slice(0, 2)}</div>
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex gap-2.5">{chairs.slice(2, 4)}</div>
        {table.capacity > 6 && (
          <><div className="absolute top-1/2 -left-3.5 -translate-y-1/2 flex flex-col gap-2.5">{chairs.slice(4, 5)}</div>
            <div className="absolute top-1/2 -right-3.5 -translate-y-1/2 flex flex-col gap-2.5">{chairs.slice(5, 6)}</div></>
        )}
      </div>
      <p className="text-sm font-black text-slate-600 uppercase tracking-widest bg-white px-3 py-1 rounded-full shadow-sm border border-slate-100">{table.capacity} ที่นั่ง</p>
    </div>
  );
}

function FilterPill({ label, count, icon, isActive = false }: { label: string; count: number; icon: React.ReactNode; isActive?: boolean }) {
  return (
    <Badge variant="ghost" className={`flex items-center gap-2 px-5 py-2 rounded-full whitespace-nowrap border ${isActive ? "bg-slate-900 text-white border-slate-900 shadow-lg" : "text-slate-600 bg-white border-slate-100"}`}>
      {icon}<span className="text-sm font-black">{label}</span><span className={`text-xs ${isActive ? 'text-amber-400' : 'text-slate-400'}`}>(${count})</span>
    </Badge>
  );
}