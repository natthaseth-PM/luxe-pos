"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { motion } from "framer-motion";

export default function TableMap() {
  const [tables, setTables] = useState<any[]>([]);

  useEffect(() => {
    // ดึงข้อมูลโต๊ะจาก Supabase
    const fetchTables = async () => {
      const { data } = await supabase.from("tables").select("*").order("name");
      if (data) setTables(data);
    };
    fetchTables();

    // Realtime Subscription: เวลา Admin แก้ไขข้อมูล หน้าจอนี้จะเปลี่ยนทันที!
    const channel = supabase.channel('table-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, fetchTables)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 p-4">
      {tables.map((table) => (
        <div key={table.id} className="flex flex-col items-center gap-3">
          {/* รูปทรงโต๊ะ: วงกลมสำหรับโต๊ะเล็ก, สี่เหลี่ยมสำหรับโต๊ะใหญ่ */}
          <motion.div
            whileTap={{ scale: 0.9 }}
            className={`
              relative flex items-center justify-center shadow-xl cursor-pointer
              ${table.capacity <= 4 ? "w-24 h-24 rounded-full" : "w-32 h-24 rounded-2xl"}
              ${table.status === 'available' ? "bg-white border-2 border-emerald-400" : "bg-amber-100 border-2 border-amber-500"}
            `}
          >
            {/* เก้าอี้รอบโต๊ะ (Visual Decoration) */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-3 bg-slate-300 rounded-t-full" />
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-3 bg-slate-300 rounded-b-full" />
            
            <span className="text-xl font-bold">{table.name}</span>
          </motion.div>
          <span className="text-xs font-medium text-slate-500">{table.capacity} ที่นั่ง</span>
        </div>
      ))}
    </div>
  );
}