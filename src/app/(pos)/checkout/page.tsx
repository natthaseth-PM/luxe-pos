"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Dot, DollarSign, QrCode, UserCircle, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/formatters";
import { toast } from "sonner";

export interface Table { id: string; name: string; capacity: number; status: 'available' | 'occupied' | 'calling_bill'; }

export default function CheckoutPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [memberPhone, setMemberPhone] = useState("");
  const [foundMember, setFoundMember] = useState<any>(null);

  useEffect(() => {
    const fetchTables = async () => {
      const { data } = await supabase.from("tables").select("*").order("name");
      if (data) {
        setTables(data as Table[]);
        if (!selectedTable) {
          const firstActive = data.find(t => t.status !== 'available');
          if (firstActive) handleSelectTable(firstActive);
        }
      }
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
    setFoundMember(null);
    setMemberPhone("");
    
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

  const handleSearchMember = () => {
    if (memberPhone.length >= 10) {
      // จำลองการค้นหาสมาชิก
      setFoundMember({ name: "คุณลินิน ใจดี", points: 1250, tier: "Platinum" });
      toast.success("พบข้อมูลสมาชิก!");
    } else {
      toast.error("กรุณากรอกเบอร์โทรศัพท์ให้ครบ");
    }
  };

  const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const netTotal = Math.max(0, subtotal - discount);

  const handleCheckout = async (method: string) => {
    if (!orderId || !selectedTable) return;
    
    try {
      await supabase.from('orders').update({ 
        status: 'paid', 
        payment_method: method, 
        total_amount: netTotal 
      }).eq('id', orderId);
      
      const newToken = crypto.randomUUID(); 
      await supabase.from('tables').update({ 
        status: 'available', 
        session_token: newToken 
      }).eq('id', selectedTable.id);
      
      toast.success(`ชำระเงินโต๊ะ ${selectedTable.name} เรียบร้อยแล้ว! 💵`);
      
      setSelectedTable(null);
      setOrderItems([]);
      setOrderId(null);
      setFoundMember(null);
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการชำระเงิน');
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full text-slate-800">
      <div className="flex-1 flex flex-col gap-6 h-full overflow-hidden">
        <header className="flex items-center gap-3 p-2 bg-white border border-slate-200 rounded-full shadow-md w-fit shrink-0">
           <FilterPill label="รอชำระเงิน" count={tables.filter(t => t.status === 'calling_bill').length} icon={<DollarSign className="w-4 h-4 text-amber-500" />} isActive />
           <FilterPill label="กำลังทาน" count={tables.filter(t => t.status === 'occupied').length} icon={<Dot className="w-6 h-6 text-rose-600 -ml-1" />} />
        </header>

        <div className="flex-1 overflow-y-auto grid grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-y-10 mt-4 pb-20 content-start px-2">
          {tables.filter(t => t.status !== 'available').map((table) => (
            <VisualTableItem key={table.id} table={table} isSelected={selectedTable?.id === table.id} onClick={() => handleSelectTable(table)} />
          ))}
        </div>
      </div>

      <div className="w-full lg:w-[380px] xl:w-[420px] shrink-0 flex flex-col bg-white border-l border-slate-100 h-full overflow-hidden shadow-2xl">
        <div className="p-6 pb-4 flex justify-between items-center bg-slate-50/80 border-b border-slate-100 shrink-0">
          <h2 className="text-xl font-black">บิลโต๊ะ: {selectedTable?.name || '-'}</h2>
          <Badge className="bg-slate-900 text-white font-black">ออเดอร์สะสม</Badge>
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
            <div className="h-full flex flex-col items-center justify-center text-slate-400 font-bold opacity-30">
              <UserCircle className="w-16 h-16 mb-2" />
              <p>เลือกโต๊ะเพื่อดูข้อมูล</p>
            </div>
          )}
        </div>

        <div className="p-6 bg-white border-t border-slate-100 flex flex-col gap-5 shadow-inner shrink-0">
          {/* ระบบสมาชิก */}
          <div className="space-y-3">
            <p className="text-xs font-black text-slate-400 uppercase tracking-tighter ml-1">ระบบสมาชิก</p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  value={memberPhone}
                  onChange={(e) => setMemberPhone(e.target.value)}
                  placeholder="เบอร์โทรศัพท์..." 
                  className="pl-10 rounded-xl h-11 font-bold bg-slate-50 border-slate-200" 
                />
              </div>
              <Button onClick={handleSearchMember} variant="outline" className="rounded-xl h-11 px-4 border-slate-200 bg-white hover:bg-slate-50">ค้นหา</Button>
            </div>
            
            {foundMember && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-3 bg-amber-50 rounded-xl border border-amber-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center"><Star className="w-4 h-4 text-amber-700" /></div>
                  <div>
                    <p className="text-xs font-black text-amber-900">{foundMember.name}</p>
                    <p className="text-[10px] text-amber-600 font-bold">ระดับ: {foundMember.tier} | แต้ม: {foundMember.points}</p>
                  </div>
                </div>
                <Badge className="bg-amber-500 text-white text-[10px]">Active</Badge>
              </motion.div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-black text-slate-400 uppercase ml-1 mb-1">ส่วนลด (บาท)</p>
              <Input type="number" value={discount || ''} onChange={(e) => setDiscount(Number(e.target.value))} placeholder="0" className="rounded-xl h-11 font-black bg-slate-50 border-slate-200" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase ml-1 mb-1">ยอดรวม</p>
              <div className="h-11 flex items-center px-3 font-black text-slate-400">{formatCurrency(subtotal)}</div>
            </div>
          </div>

          <div className="bg-slate-900 p-6 rounded-3xl shadow-xl text-center">
            <p className="text-xs font-black text-amber-400 uppercase mb-1 tracking-widest">ยอดสุทธิรวม</p>
            <p className="text-4xl font-black tracking-tight text-white">{formatCurrency(netTotal)}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
             <Button onClick={() => handleCheckout('cash')} disabled={!orderId} className="h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg rounded-2xl shadow-lg transition-all">รับเงินสด</Button>
             <Button onClick={() => handleCheckout('transfer')} disabled={!orderId} className="h-14 bg-sky-600 hover:bg-sky-700 text-white font-black text-lg rounded-2xl shadow-lg transition-all">เงินโอน / QR</Button>
          </div>
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
    <Badge variant="ghost" className={`flex items-center gap-2 px-5 py-2 rounded-full border-2 ${isActive ? "bg-slate-900 text-white border-slate-900" : "text-slate-600 bg-white border-slate-100"}`}>
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