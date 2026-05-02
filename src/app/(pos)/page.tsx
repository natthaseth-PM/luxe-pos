"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { UserCircle, Dot, CheckCircle2, ListChecks } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

export interface Table {
  id: string;
  name: string;
  capacity: number;
  status: 'available' | 'occupied' | 'calling_bill';
}

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
    <div className="flex flex-col gap-6 h-full text-slate-800">
      <header className="flex flex-col gap-4 shrink-0">
        <div className="flex items-center gap-2.5 p-1.5 bg-white border border-slate-200 rounded-full shadow-sm overflow-x-auto w-fit">
          <FilterPill label="ทั้งหมด" count={tables.length} icon={<ListChecks className="w-4 h-4 text-slate-500"/>} isActive />
          <FilterPill label="ว่าง (กดเพื่อเปิดบิล)" count={tables.filter(t => t.status === 'available').length} icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />} />
          <FilterPill label="มีลูกค้า" count={tables.filter(t => t.status === 'occupied').length} icon={<Dot className="w-6 h-6 text-rose-500 -ml-1" />} />
        </div>
      </header>

      <AnimatePresence>
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-slate-400">กำลังโหลดข้อมูลโต๊ะ...</div>
        ) : tables.length === 0 ? (
           <div className="flex-1 flex items-center justify-center text-slate-400">ไม่พบข้อมูลโต๊ะ</div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 overflow-y-auto grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-x-4 gap-y-8 pb-10 pr-2 content-start"
          >
            {tables.map((table) => (
              <VisualTableItem 
                key={table.id} 
                table={table} 
                onClick={() => {
                  if (table.status === 'available') {
                    // เข้ารหัสชื่อโต๊ะเผื่อมีเว้นวรรค
                    router.push(`/menu?table=${encodeURIComponent(table.name)}`);
                  }
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
      case 'available': return { ring: "border-emerald-500 bg-emerald-100", circle: "text-emerald-700 shadow-emerald-500/40", chair: "bg-emerald-500" };
      case 'occupied': return { ring: "border-rose-500 bg-rose-100", circle: "text-rose-700 shadow-rose-500/40", chair: "bg-rose-500" };
      case 'calling_bill': return { ring: "border-amber-500 bg-amber-100", circle: "text-amber-700 shadow-amber-500/40", chair: "bg-amber-500" };
    }
  };

  const styles = getStatusStyles(table.status);
  const isAvailable = table.status === 'available';
  const chairs = Array.from({ length: table.capacity <= 6 ? 4 : 6 }, (_, i) => (
    <div key={i} className={`w-4 h-3.5 rounded-sm ${styles.chair}`}></div>
  ));

  return (
    <div className={`flex flex-col items-center gap-2 ${!isAvailable && 'opacity-80'}`}>
      <div className={`relative flex items-center justify-center p-2 rounded-full border-4 ${styles.ring} transition-all`}>
        <motion.div
          whileTap={isAvailable ? { scale: 0.92 } : {}}
          onClick={onClick}
          className={`relative w-20 h-20 rounded-full flex flex-col items-center justify-center bg-white shadow-xl transition-all duration-300 ${styles.circle} ${isAvailable ? 'cursor-pointer hover:shadow-2xl hover:scale-105' : 'cursor-not-allowed'}`}
        >
          <span className="text-2xl font-black">{table.name}</span>
          {!isAvailable && <UserCircle className="w-5 h-5 absolute top-2 right-2 opacity-80" />}
        </motion.div>

        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 flex gap-2">{chairs.slice(0, 2)}</div>
        <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 flex gap-2">{chairs.slice(2, 4)}</div>
        {table.capacity > 6 && (
          <>
            <div className="absolute top-1/2 -left-2.5 -translate-y-1/2 flex flex-col gap-2">{chairs.slice(4, 5)}</div>
            <div className="absolute top-1/2 -right-2.5 -translate-y-1/2 flex flex-col gap-2">{chairs.slice(5, 6)}</div>
          </>
        )}
      </div>
      <p className="text-xs font-bold text-slate-500">{table.capacity} ที่นั่ง</p>
    </div>
  );
}

function FilterPill({ label, count, icon, isActive = false }: { label: string; count: number; icon: React.ReactNode; isActive?: boolean }) {
  return (
    <Badge variant="ghost" className={`flex items-center gap-1.5 px-4 py-2 rounded-full whitespace-nowrap ${isActive ? "bg-slate-100 text-slate-800 shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}>
      {icon}
      <span className="text-sm font-semibold">{label}</span>
      <span className="text-sm font-medium opacity-60">({count})</span>
    </Badge>
  );
}