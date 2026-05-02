"use client";

import React, { useEffect, useState, Suspense, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, Trash2, Printer, Minus, Plus, ChevronLeft, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/formatters";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";

interface CartItem { id: string; name: string; price: number; quantity: number; image_url: string; }

function MenuContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tableName = searchParams.get("table");
  const isInitialMount = useRef(true); // ใช้ป้องกัน Toast เด้งซ้อนตอนโหลดหน้า

  const [categories, setCategories] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    // บังคับเลือกโต๊ะก่อน และป้องกัน Toast ซ้อน
    if (!tableName && isInitialMount.current) {
      toast.error("กรุณาเลือกโต๊ะก่อนสั่งอาหาร!");
      router.push("/");
      isInitialMount.current = false;
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: cats } = await supabase.from("categories").select("*").order("sort_order");
        if (cats) setCategories([{ id: "all", name: "ทั้งหมด" }, ...cats]);

        const { data: items } = await supabase.from("menu_items").select("*");
        if (items) setMenuItems(items);
      } catch (err) {
        console.error("Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [tableName, router]);

  const addToCart = (item: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { id: item.id, name: item.name, price: item.price, image_url: item.image_url, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) return { ...item, quantity: item.quantity + delta };
      return item;
    }).filter(item => item.quantity > 0));
  };

  const filteredMenu = activeCategory === "all" ? menuItems : menuItems.filter(item => item.category_id === activeCategory);
  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // ปรับปรุงฟังก์ชันบันทึกออเดอร์ลง Supabase
  const handleSendToKitchen = async () => {
    if (cart.length === 0) return;
    const loadingToast = toast.loading("กำลังส่งออเดอร์เข้าครัว...");
    
    try {
      const { data: tableData } = await supabase.from('tables').select('id').eq('name', tableName).single();
      if (!tableData) throw new Error('ไม่พบข้อมูลโต๊ะ');

      let orderId;
      const { data: existingOrder } = await supabase.from('orders').select('id').eq('table_id', tableData.id).eq('status', 'dining').maybeSingle();

      if (existingOrder) {
        orderId = existingOrder.id;
      } else {
        const { data: newOrder, error: orderError } = await supabase.from('orders').insert([{ table_id: tableData.id, status: 'dining', total_amount: 0 }]).select().single();
        if (orderError) throw orderError;
        orderId = newOrder?.id;
        await supabase.from('tables').update({ status: 'occupied' }).eq('id', tableData.id);
      }

      const itemsToInsert = cart.map(item => ({
        order_id: orderId,
        menu_item_id: item.id,
        quantity: item.quantity,
        status: 'pending'
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(itemsToInsert);
      if (itemsError) throw itemsError;

      setCart([]); 
      toast.success('ส่งออเดอร์เข้าครัวเรียบร้อยแล้ว! 🍳', { id: loadingToast });
    } catch (err: any) {
      console.error("Database Error:", err);
      toast.error(`ส่งออเดอร์ไม่สำเร็จ: ${err.message}`, { id: loadingToast });
    }
  };

  const handlePrintQR = async () => {
    const { data: settings } = await supabase.from('store_settings').select('*').maybeSingle();
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head><title>QR Order - ${tableName}</title><style>@page { size: 80mm auto; margin: 0; } body { width: 80mm; padding: 5mm; text-align: center; font-family: 'Kanit', sans-serif; } .title { font-size: 22px; font-weight: bold; } .table { font-size: 28px; font-weight: 900; background: #000; color: #fff; margin: 10px 0; padding: 5px; } img { width: 50mm; }</style></head>
          <body>
            <div class="title">${settings?.store_name || 'Luxe POS'}</div>
            <div class="table">โต๊ะ: ${tableName}</div>
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://luxe-pos.app/order/${tableName}" />
            <p>${settings?.receipt_message || 'สแกนสั่งอาหารได้เลย'}</p>
            <script>window.onload = () => { window.print(); window.close(); }</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full text-slate-800">
      <div className="flex-1 flex flex-col gap-6 h-full overflow-hidden">
        <header className="flex items-center gap-2 overflow-x-auto pb-2 shrink-0 scrollbar-hide">
          {categories.map((cat) => (
            <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`relative px-6 py-3 rounded-full text-sm font-bold whitespace-nowrap transition-all ${activeCategory === cat.id ? "text-white" : "text-slate-600 bg-white border border-slate-200 hover:bg-slate-50"}`}>
              {activeCategory === cat.id && <motion.div layoutId="active-pill" className="absolute inset-0 bg-amber-500 rounded-full shadow-lg" style={{ zIndex: -1 }} />}
              <span className="relative z-10">{cat.name}</span>
            </button>
          ))}
        </header>

        <div className="flex-1 overflow-y-auto pb-10">
          {loading ? (
            <div className="h-full flex items-center justify-center font-bold text-slate-400">กำลังโหลดเมนู...</div>
          ) : activeCategory === "all" ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pr-2">
              {categories.filter(c => c.id !== 'all').map(cat => (
                <motion.div key={cat.id} onClick={() => setActiveCategory(cat.id)} whileHover={{ scale: 1.05 }} className="bg-white rounded-3xl p-8 border-2 border-slate-100 shadow-xl cursor-pointer flex flex-col items-center gap-4 aspect-square hover:border-amber-200 transition-all">
                  <span className="text-5xl">{cat.name === 'ต้ม' ? '🍲' : cat.name === 'ผัด' ? '🥘' : cat.name === 'แกง' ? '🍛' : cat.name === 'ทอด' ? '🍤' : '🍹'}</span>
                  <div className="text-center"><h3 className="text-2xl font-black text-slate-800">{cat.name}</h3><p className="text-sm font-bold text-slate-400 mt-1">{menuItems.filter(m => m.category_id === cat.id).length} รายการ</p></div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-6 pr-2">
              <button onClick={() => setActiveCategory("all")} className="flex items-center gap-2 text-md font-black text-slate-500 hover:text-amber-600 transition-colors bg-white px-4 py-2 rounded-full border border-slate-100 shadow-sm w-fit"><ChevronLeft className="w-5 h-5" /> กลับไปเลือกหมวดหมู่</button>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
                {filteredMenu.map((item) => (
                  <motion.div key={item.id} onClick={() => addToCart(item)} whileHover={{ y: -5 }} className="bg-white rounded-3xl p-4 border-2 border-slate-50 shadow-md flex flex-col gap-3 cursor-pointer hover:border-amber-200 group">
                    <div className="aspect-square bg-slate-50 rounded-2xl p-4 flex items-center justify-center overflow-hidden"><img src={item.image_url} alt={item.name} className="w-full h-full object-contain group-hover:scale-110 transition-all" /></div>
                    <div className="flex flex-col flex-1"><h3 className="font-bold text-slate-800 line-clamp-2">{item.name}</h3><div className="mt-auto pt-3 flex items-center justify-between"><span className="font-black text-amber-600 text-lg">{formatCurrency(item.price)}</span><div className="w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center group-hover:bg-amber-500 transition-colors shadow-inner"><Plus className="w-4 h-4" /></div></div></div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="w-full lg:w-[350px] shrink-0 flex flex-col bg-white border-l border-slate-100 h-full overflow-hidden shadow-2xl">
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3"><ShoppingCart className="w-6 h-6 text-amber-400" /><h2 className="text-xl font-bold">ออเดอร์ใหม่</h2></div>
          <Badge className="bg-amber-500 text-white px-3 py-1 font-black border-0">โต๊ะ {tableName}</Badge>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {cart.length === 0 ? <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50"><ShoppingCart className="w-16 h-16 mb-2" /><p className="font-bold">ยังไม่มีรายการอาหาร</p></div> : 
            <AnimatePresence>{cart.map((item) => (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} key={item.id} className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex-1 min-w-0 pr-3"><p className="font-bold text-slate-800 text-sm truncate">{item.name}</p><p className="text-sm font-black text-amber-600">{formatCurrency(item.price * item.quantity)}</p></div>
                <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-100 shrink-0">
                  <button onClick={(e) => { e.stopPropagation(); updateQuantity(item.id, -1); }} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm text-slate-600 hover:text-rose-500 transition-colors">
                    {item.quantity === 1 ? <Trash2 className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                  </button>
                  <span className="font-black w-5 text-center">{item.quantity}</span>
                  <button onClick={(e) => { e.stopPropagation(); updateQuantity(item.id, 1); }} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm text-emerald-500 hover:text-emerald-600 transition-colors"><Plus className="w-4 h-4" /></button>
                </div>
              </motion.div>
            ))}</AnimatePresence>
          }
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col gap-4">
          <div className="flex justify-between items-center font-black"><span>รวมทั้งหมด ({cartItemCount})</span><span className="text-2xl text-amber-600">{formatCurrency(cartTotal)}</span></div>
          <Button onClick={handlePrintQR} variant="outline" className="w-full h-12 border-sky-300 text-sky-700 font-black rounded-xl shadow-sm bg-white"><Printer className="w-4 h-4 mr-2" /> พิมพ์ใบสแกนสั่งอาหาร</Button>
          <Button onClick={handleSendToKitchen} disabled={cart.length === 0} className="w-full h-16 bg-amber-500 text-white font-black text-xl rounded-2xl shadow-xl hover:bg-amber-600 transition-all">ส่งเข้าห้องครัว</Button>
        </div>
      </div>
    </div>
  );
}

export default function MenuPage() {
  return <Suspense fallback={<div className="h-full flex items-center justify-center font-bold text-slate-400">กำลังเตรียมหน้าจอ...</div>}><MenuContent /></Suspense>;
}