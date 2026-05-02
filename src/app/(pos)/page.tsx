"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { UserCircle, Dot, CheckCircle2, ListChecks, DollarSign } from "lucide-react";
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
          <FilterPill label="ว่าง (กดเพื่อเปิดบิล)" count={tables.filter(t => t.status === 'available').length} icon={<CheckCircle2 className="w-4 h-4 text-sky-500" />} />
          <FilterPill label="มีลูกค้า" count={tables.filter(t => t.status === 'occupied').length} icon={<Dot className="w-6 h-6 text-amber-500 -ml-1" />} />
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
                // โต๊ะว่างเท่านั้นถึงจะกดไปหน้า Menu ได้
                onClick={() => {
                  if (table.status === 'available') {
                    router.push(`/menu?table=${table.name}`);
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
      case 'available': return { table: "border-sky-200 bg-sky-50 shadow-sky-500/5", chair: "bg-sky-200", text: "text-slate-700" };
      case 'occupied': return { table: "border-amber-300 bg-amber-50 shadow-amber-500/5", chair: "bg-amber-300", text: "text-slate-800" };
      case 'calling_bill': return { table: "border-emerald-300 bg-emerald-50 shadow-emerald-500/5", chair: "bg-emerald-300", text: "text-slate-800" };
    }
  };

  const styles = getStatusStyles(table.status);
  const isAvailable = table.status === 'available';
  const chairs = Array.from({ length: table.capacity <= 6 ? 4 : 6 }, (_, i) => (
    <div key={i} className={`w-4 h-3.5 rounded-sm ${styles.chair}`}></div>
  ));

  return (
    <div className={`flex flex-col items-center gap-2 ${!isAvailable && 'opacity-60 grayscale-[30%]'}`}>
      <div className={`relative flex items-center justify-center p-1.5 rounded-full border-2 ${styles.table}`}>
        <motion.div
          whileTap={isAvailable ? { scale: 0.92 } : {}}
          onClick={onClick}
          className={`relative w-24 h-24 rounded-full flex flex-col items-center justify-center shadow-md transition-colors duration-300 bg-white ${styles.table} ${isAvailable ? 'cursor-pointer' : 'cursor-not-allowed'}`}
        >
          <span className={`text-2xl font-bold ${styles.text}`}>{table.name}</span>
          {!isAvailable && <UserCircle className="w-5 h-5 text-amber-500 absolute top-2 right-2" />}
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
      <p className="text-xs font-bold text-slate-400">{table.capacity} ที่นั่ง</p>
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