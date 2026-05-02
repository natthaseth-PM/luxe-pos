"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Dot, DollarSign, QrCode, UserCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/formatters";
import { toast } from "sonner";

export interface Table { 
  id: string; 
  name: string; 
  capacity: number; 
  status: 'available' | 'occupied' | 'calling_bill'; 
}

export default function CheckoutPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTables = async () => {
      const { data } = await supabase.from("tables").select("*").order("name");
      if (data) {
        setTables(data as Table[]);
        // เลือกโต๊ะแรกที่ "มีลูกค้า" หรือ "รอเช็คบิล" เป็นค่าเริ่มต้น
        if (!selectedTable) {
          const firstActive = data.find(t => t.status !== 'available');
          if (firstActive) handleSelectTable(firstActive);
        }
      }
      setLoading(false);
    };
    fetchTables();

    const channel = supabase.channel('table-checkout-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, fetchTables)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedTable]);

  const handleSelectTable = async (table: Table) => {
    setSelectedTable(table);
    setDiscount(0);
    
    // ดึงออเดอร์ที่สถานะ 'dining' (กำลังทาน) ของโต๊ะนี้
    const { data: orderData } = await supabase
      .from('orders')
      .select(`id, order_items(id, quantity, menu_items(name, price))`)
      .eq('table_id', table.id)
      .eq('status', 'dining')
      .maybeSingle();

    if (orderData) {
      setOrderId(orderData.id);
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

  const handleCheckout = async (method: string) => {
    if (!orderId || !selectedTable) return;
    
    try {
      // 1. อัปเดตสถานะออเดอร์เป็นจ่ายแล้ว (paid)
      await supabase.from('orders').update({ 
        status: 'paid', 
        payment_method: method, 
        total_amount: netTotal 
      }).eq('id', orderId);
      
      // 2. เคลียร์โต๊ะให้ว่าง และรีเซ็ต session_token ใหม่ เพื่อให้ QR เดิมหมดอายุ
      const newToken = crypto.randomUUID(); 
      await supabase.from('tables').update({ 
        status: 'available', 
        session_token: newToken 
      }).eq('id', selectedTable.id);
      
      toast.success(`ชำระเงินโต๊ะ ${selectedTable.name} เรียบร้อยแล้ว! 💵`);
      
      setSelectedTable(null);
      setOrderItems([]);
      setOrderId(null);
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการชำระเงิน');
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full text-slate-800">
      {/* ฝั่งซ้าย: ผังโต๊ะเฉพาะโต๊ะไม่ว่าง */}
      <div className="flex-1 flex flex-col gap-6 h-full overflow-hidden">
        <header className="flex items-center gap-3 p-2 bg-white border border-slate-200 rounded-full shadow-md w-fit shrink-0">
           <FilterPill label="รอชำระเงิน" count={tables.filter(t => t.status === 'calling_bill').length} icon={<DollarSign className="w-4 h-4 text-amber-500" />} isActive />
           <FilterPill label="กำลังทาน" count={tables.filter(t => t.status === 'occupied').length} icon={<Dot className="w-6 h-6 text-rose-600 -ml-1" />} />
        </header>

        <div className="flex-1 overflow-y-auto grid grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-4 gap-y-10 pb-20 pr-2 content-start px-2 mt-4">
          {tables.filter(t => t.status !== 'available').map((table) => (
            <VisualTableItem 
              key={table.id} 
              table={table} 
              isSelected={selectedTable?.id === table.id} 
              onClick={() => handleSelectTable(table)} 
            />
          ))}
        </div>
      </div>

      {/* ฝั่งกลาง: รายการอาหารในบิล */}
      <div className="w-full lg:w-[320px] xl:w-[350px] shrink-0 flex flex-col bg-white border-l border-slate-100 h-full overflow-hidden shadow-sm">
        <div className="p-6 pb-4 flex justify-between items-center bg-slate-50/80 border-b border-slate-100">
          <h2 className="text-xl font-black">บิลโต๊ะ: {selectedTable?.name || '-'}</h2>
          <Badge className="bg-slate-900 text-white">ยอดปัจจุบัน</Badge>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {orderItems.length > 0 ? (
            orderItems.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between border-b border-slate-50 py-2">
                <div className="flex-1 min-w-0 pr-2">
                  <p className="font-bold text-sm truncate">{item.name}</p>
                  <p className="text-sm font-black text-amber-600">{formatCurrency(item.price * item.quantity)}</p>
                </div>
                <span className="font-black text-lg text-slate-400">x{item.quantity}</span>
              </div>
            ))
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 font-bold text-center opacity-50">
              <UserCircle className="w-12 h-12 mb-2" />
              <p>กรุณาเลือกโต๊ะ</p>
            </div>
          )}
        </div>

        {/* ส่วนชำระเงินด้านล่าง */}
        <div className="p-6 bg-white border-t border-slate-100 flex flex-col gap-6 shadow-inner">
          <h2 className="text-2xl font-black tracking-tighter">ชำระเงิน</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2 ml-1">ส่วนลด (บาท)</p>
              <Input 
                type="number" 
                value={discount || ''} 
                onChange={(e) => setDiscount(Number(e.target.value))} 
                placeholder="0" 
                className="rounded-xl h-12 font-bold bg-slate-50" 
              />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2 ml-1">ยอดก่อนลด</p>
              <div className="h-12 flex items-center px-3 font-bold text-slate-400 border border-transparent">{formatCurrency(subtotal)}</div>
            </div>
          </div>

          <div className="mt-auto bg-[#FFF9ED] p-6 rounded-3xl border-2 border-[#FDEBCE] shadow-lg text-center">
            <p className="text-sm font-black text-[#BCA171] uppercase mb-1">ยอดสุทธิรวม</p>
            <p className="text-4xl font-black tracking-tight text-[#8A6727]">{formatCurrency(netTotal)}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-2">
             <Button disabled={!orderId} onClick={() => handleCheckout('cash')} className="h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-lg rounded-2xl transition-all">รับเงินสด</Button>
             <Button disabled={!orderId} onClick={() => handleCheckout('transfer')} className="h-14 bg-sky-600 hover:bg-sky-700 text-white font-black shadow-lg rounded-2xl transition-all">เงินโอน / QR</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-components UI โต๊ะสไตล์พรีเมียม
function VisualTableItem({ table, onClick, isSelected }: { table: Table, onClick: () => void, isSelected: boolean }) {
  const styles = table.status === 'occupied' 
    ? { ring: "border-rose-600 bg-rose-50", circle: "text-rose-800" } 
    : { ring: "border-amber-500 bg-amber-50", circle: "text-amber-800" };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`relative flex items-center justify-center p-2.5 rounded-full border-[4px] transition-all duration-300 ${isSelected ? 'border-slate-900 bg-slate-900 scale-110 shadow-2xl' : styles.ring}`}>
        <motion.div
          whileTap={{ scale: 0.92 }}
          onClick={onClick}
          className={`relative w-20 h-20 rounded-full flex flex-col items-center justify-center bg-white shadow-xl cursor-pointer transition-colors duration-300 ${isSelected ? 'text-slate-900' : styles.circle}`}
        >
          <span className="text-2xl font-black tracking-tighter">{table.name}</span>
        </motion.div>
      </div>
    </div>
  );
}

function FilterPill({ label, count, icon, isActive = false }: { label: string; count: number; icon: React.ReactNode; isActive?: boolean }) {
  return (
    <Badge variant="ghost" className={`flex items-center gap-2 px-4 py-2 rounded-full border ${isActive ? "bg-slate-900 text-white border-slate-900 shadow-md" : "text-slate-600 bg-white border-slate-100"}`}>
      {icon}<span className="text-sm font-black">{label}</span><span className="text-xs ml-1 opacity-60">({count})</span>
    </Badge>
  );
}

function PaymentButton({ label, icon, active = false }: { label: string; icon: React.ReactNode; active?: boolean }) {
  return (
    <button className={`w-full py-4 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 transition-all ${active ? "bg-emerald-50 border-emerald-500 text-emerald-900 shadow-md" : "bg-slate-50 border-slate-100 text-slate-500"}`}>
      <div className={`p-2 rounded-full ${active ? 'bg-white shadow-sm' : 'bg-transparent'}`}>{icon}</div>
      <span className="font-black text-sm">{label}</span>
    </button>
  );
}