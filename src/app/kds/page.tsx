"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { ChefHat, CheckCircle2, Clock } from "lucide-react";

export default function KDSPage() {
  const [orderItems, setOrderItems] = useState<any[]>([]);

  useEffect(() => {
    const fetchOrders = async () => {
      // ดึงรายการอาหารที่ยังไม่เสิร์ฟ พร้อมชื่อเมนูและชื่อโต๊ะ
      const { data, error } = await supabase
        .from("order_items")
        .select(`
          id, quantity, status, created_at,
          menu_items (name),
          orders (tables (name))
        `)
        .in('status', ['pending', 'cooking', 'ready'])
        .order('created_at', { ascending: true });
      
      if (!error && data) setOrderItems(data);
    };

    fetchOrders();

    // Realtime รอรับออเดอร์ใหม่จากหน้าร้าน
    const channel = supabase.channel('kds-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, fetchOrders)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const updateStatus = async (id: string, newStatus: string) => {
    await supabase.from("order_items").update({ status: newStatus }).eq("id", id);
  };

  return (
    <div className="h-full flex flex-col p-6 gap-6">
      <header className="flex items-center gap-4 border-b border-slate-800 pb-4 shrink-0">
        <div className="p-3 bg-amber-500 rounded-xl"><ChefHat className="w-8 h-8 text-white" /></div>
        <h1 className="text-3xl font-black">ห้องครัว (KDS)</h1>
      </header>

      <div className="flex-1 grid grid-cols-3 gap-6 overflow-hidden">
        <KanbanColumn title="ออเดอร์ใหม่" status="pending" items={orderItems} onUpdate={updateStatus} color="sky" />
        <KanbanColumn title="กำลังปรุง" status="cooking" items={orderItems} onUpdate={updateStatus} color="amber" />
        <KanbanColumn title="รอเสิร์ฟ" status="ready" items={orderItems} onUpdate={updateStatus} color="emerald" />
      </div>
    </div>
  );
}

function KanbanColumn({ title, status, items, onUpdate, color }: any) {
  const columnItems = items.filter((i: any) => i.status === status);
  const bgColors: any = { sky: "bg-sky-500", amber: "bg-amber-500", emerald: "bg-emerald-500" };
  const nextStatus: any = { pending: 'cooking', cooking: 'ready', ready: 'served' };

  return (
    <div className="flex flex-col bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden">
      <div className={`p-4 ${bgColors[color]} text-white font-black text-xl flex justify-between`}>
        <span>{title}</span>
        <span className="bg-white/20 px-3 rounded-full">{columnItems.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {columnItems.map((item: any) => (
            <motion.div key={item.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="bg-slate-800 p-5 rounded-2xl border border-slate-700 flex flex-col gap-4 shadow-lg"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-white">{item.menu_items?.name}</h3>
                  <p className="text-amber-400 font-bold mt-1">โต๊ะ: {item.orders?.tables?.name}</p>
                </div>
                <span className="text-3xl font-black bg-slate-950 px-4 py-2 rounded-xl text-white">x{item.quantity}</span>
              </div>
              <button 
                onClick={() => onUpdate(item.id, nextStatus[status])}
                className={`w-full py-3 rounded-xl font-bold text-lg transition-colors ${status === 'ready' ? 'bg-emerald-500 hover:bg-emerald-400 text-white' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}
              >
                {status === 'pending' ? 'เริ่มทำอาหาร' : status === 'cooking' ? 'ทำเสร็จแล้ว' : 'เสิร์ฟลูกค้าแล้ว'}
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}