"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Dot, DollarSign, QrCode, Tag, Coins } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/formatters";

export interface Table { id: string; name: string; capacity: number; status: 'available' | 'occupied' | 'calling_bill'; }

export default function CheckoutPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [discount, setDiscount] = useState<number>(0);

  useEffect(() => {
    const fetchTables = async () => {
      const { data } = await supabase.from("tables").select("*").order("name");
      if (data) {
        setTables(data as Table[]);
        const firstActive = data.find(t => t.status !== 'available');
        if (firstActive && !selectedTable) handleSelectTable(firstActive);
      }
    };
    fetchTables();

    const channel = supabase.channel('table-checkout-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, fetchTables)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleSelectTable = async (table: Table) => {
    setSelectedTable(table);
    setDiscount(0); // รีเซ็ตส่วนลด
    
    // ดึงออเดอร์ที่กำลังทานอยู่ของโต๊ะนี้
    const { data: orderData } = await supabase
      .from('orders')
      .select(`id, order_items(id, quantity, menu_items(name, price))`)
      .eq('table_id', table.id)
      .eq('status', 'dining')
      .maybeSingle();

    if (orderData) {
      setOrderId(orderData.id);
      // รวมข้อมูลที่ Join มาให้อ่านง่าย
      const items = orderData.order_items.map((item: any) => ({
        id: item.id,
        name: item.menu_items?.name,
        price: item.menu_items?.price,
        quantity: item.quantity
      }));
      setOrderItems(items);
    } else {
      setOrderId(null);
      setOrderItems([]);
    }
  };

  const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const netTotal = Math.max(0, subtotal - discount);

  // ฟังก์ชัน ปิดบิล และ รีเซ็ต Token
  const handleCheckout = async (method: string) => {
    if (!orderId || !selectedTable) return;
    
    // 1. อัปเดตสถานะบิลเป็นจ่ายแล้ว
    await supabase.from('orders').update({ status: 'paid', payment_method: method, total_amount: netTotal }).eq('id', orderId);
    
    // 2. เคลียร์โต๊ะให้ว่าง และสร้าง Token ใหม่ (รีเซ็ต QR Code)
    const newToken = crypto.randomUUID(); 
    await supabase.from('tables').update({ status: 'available', session_token: newToken }).eq('id', selectedTable.id);
    
    alert(`รับชำระเงินโต๊ะ ${selectedTable.name} เรียบร้อยแล้ว!`);
    
    setSelectedTable(null);
    setOrderItems([]);
    setOrderId(null);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full text-slate-800">
      
      {/* ======== ผังโต๊ะ ======== */}
      <div className="flex-1 flex flex-col gap-6 h-full overflow-hidden">
        <header className="flex items-center gap-3 p-2 bg-white border border-slate-200 rounded-full shadow-md w-fit shrink-0">
           <FilterPill label="รอชำระเงิน" count={tables.filter(t => t.status === 'calling_bill').length} icon={<DollarSign className="w-4 h-4 text-amber-500" />} isActive />
           <FilterPill label="กำลังทาน" count={tables.filter(t => t.status === 'occupied').length} icon={<Dot className="w-6 h-6 text-rose-600 -ml-1" />} />
        </header>

        <div className="flex-1 overflow-y-auto grid grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-4 gap-y-10 pb-20 pr-2 content-start px-2 mt-4">
          {tables.filter(t => t.status !== 'available').map((table) => (
            <VisualTableItem key={table.id} table={table} isSelected={selectedTable?.id === table.id} onClick={() => handleSelectTable(table)} />
          ))}
        </div>
      </div>

      {/* ======== รายการที่สั่ง ======== */}
      <div className="w-full lg:w-[280px] xl:w-[320px] shrink-0 flex flex-col bg-white border-l border-slate-100 h-full overflow-hidden shadow-sm">
        <div className="p-6 pb-4 flex justify-between items-center bg-slate-50/80 border-b border-slate-100">
          <h2 className="text-xl font-black">บิลโต๊ะ: {selectedTable?.name || '-'}</h2>
          <Badge className="bg-slate-900 text-white">ยอดปัจจุบัน</Badge>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {orderItems.length > 0 ? (
            orderItems.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 py-3 border-b border-slate-50">
                <div className="flex-1 min-w-0 pr-2">
                  <p className="font-bold text-sm truncate">{item.name}</p>
                  <p className="text-sm font-black text-amber-600">{formatCurrency(item.price * item.quantity)}</p>
                </div>
                <span className="font-black text-lg text-slate-400">x{item.quantity}</span>
              </div>
            ))
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 font-bold text-center">ไม่มีรายการอาหาร<br/>หรือยังไม่ได้เลือกโต๊ะ</div>
          )}
        </div>
      </div>

      {/* ======== ชำระเงิน ======== */}
      <div className="w-full lg:w-[300px] xl:w-[340px] shrink-0 flex flex-col bg-white border border-slate-100 rounded-3xl shadow-sm p-6 gap-6 h-full overflow-y-auto">
        <h2 className="text-2xl font-black tracking-tighter">ชำระเงิน</h2>
        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input placeholder="เบอร์โทรสมาชิก..." className="pl-10 rounded-xl h-12 text-sm font-bold bg-slate-50" /></div>
        
        <div className="grid grid-cols-2 gap-4 mt-2">
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-2 ml-1">ส่วนลด (บาท)</p>
            <Input type="number" value={discount || ''} onChange={(e) => setDiscount(Number(e.target.value))} placeholder="0" className="rounded-xl bg-slate-50/50 border-slate-200 h-11 font-bold" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-2 ml-1">ยอดก่อนลด</p>
            <div className="h-11 flex items-center px-3 font-bold text-slate-500">{formatCurrency(subtotal)}</div>
          </div>
        </div>

        <div className="mt-auto bg-[#FFF9ED] p-6 rounded-3xl border-2 border-[#FDEBCE] shadow-lg text-center">
          <p className="text-sm font-black text-[#BCA171] uppercase mb-1">ยอดสุทธิรวม</p>
          <p className="text-4xl font-black tracking-tight text-[#8A6727]">{formatCurrency(netTotal)}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-2">
           <Button disabled={!orderId} onClick={() => handleCheckout('cash')} className="h-14 bg-emerald-500 hover:bg-emerald-600 text-white font-black shadow-lg">รับเงินสด</Button>
           <Button disabled={!orderId} onClick={() => handleCheckout('transfer')} className="h-14 bg-sky-500 hover:bg-sky-600 text-white font-black shadow-lg">เงินโอน / QR</Button>
        </div>
      </div>
    </div>
  );
}

function VisualTableItem({ table, onClick, isSelected }: { table: Table, onClick: () => void, isSelected: boolean }) {
  const styles = table.status === 'occupied' ? { ring: "border-rose-600 bg-rose-50", circle: "text-rose-800" } : { ring: "border-amber-500 bg-amber-50", circle: "text-amber-800" };
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`relative flex items-center justify-center p-2.5 rounded-full border-[4px] transition-all duration-300 ${isSelected ? 'border-slate-900 bg-slate-900 scale-110 shadow-2xl' : styles.ring}`}>
        <motion.div whileTap={{ scale: 0.92 }} onClick={onClick} className={`relative w-20 h-20 rounded-full flex flex-col items-center justify-center bg-white shadow-xl cursor-pointer transition-colors duration-300 ${isSelected ? 'text-slate-900' : styles.circle}`}>
          <span className="text-2xl font-black tracking-tighter">{table.name}</span>
        </motion.div>
      </div>
    </div>
  );
}

function FilterPill({ label, count, icon, isActive = false }: { label: string; count: number; icon: React.ReactNode; isActive?: boolean }) {
  return (
    <Badge variant="ghost" className={`flex items-center gap-2 px-4 py-2 rounded-full border ${isActive ? "bg-slate-900 text-white border-slate-900" : "text-slate-600 bg-white border-slate-100"}`}>
      {icon}<span className="text-sm font-black">{label}</span><span className="text-xs ml-1 opacity-60">({count})</span>
    </Badge>
  );
}