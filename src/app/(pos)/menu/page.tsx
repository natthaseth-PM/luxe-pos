"use client";

import React, { useEffect, useState, Suspense } from "react";
import { supabase } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, ShoppingCart, Trash2, Printer, Minus, ChevronLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge"; // <-- เพิ่มตรงนี้
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/formatters";
import { useSearchParams } from "next/navigation";

interface CartItem { id: string; name: string; price: number; quantity: number; image_url: string; }

// สร้าง Component แยกสำหรับเนื้อหา เพื่อให้ใช้ useSearchParams ได้อย่างปลอดภัย
function MenuContent() {
  const searchParams = useSearchParams();
  const tableName = searchParams.get("table") || "สั่งกลับบ้าน";

  const [categories, setCategories] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: cats } = await supabase.from("categories").select("*").order("name");
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
  }, []);

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

  const filteredMenu = menuItems.filter(item => {
    const matchCategory = activeCategory === "all" || item.category_id === activeCategory;
    const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handlePrintQR = async () => {
    const { data: settings } = await supabase.from('store_settings').select('*').single();
    const storeName = settings?.store_name || "Luxe POS";
    const wifiPass = settings?.wifi_password || "ไม่มี";
    const message = settings?.receipt_message || "ขอบคุณที่ใช้บริการ";

    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>QR Code - โต๊ะ ${tableName}</title>
            <style>
              @page { size: 80mm auto; margin: 0; }
              body { width: 80mm; padding: 5mm; margin: 0; text-align: center; font-family: 'Kanit', sans-serif; box-sizing: border-box; }
              .title { font-size: 22px; font-weight: bold; margin-bottom: 5px; }
              .table-name { font-size: 24px; font-weight: 900; background: #000; color: #fff; padding: 5px; border-radius: 5px; display: inline-block; margin-bottom: 10px;}
              img { width: 50mm; height: 50mm; margin: 0 auto; display: block; }
              .footer { font-size: 14px; margin-top: 15px; border-top: 1px dashed #ccc; padding-top: 10px; font-weight: bold;}
            </style>
          </head>
          <body>
            <div class="title">${storeName}</div>
            <div style="font-size:12px; margin-bottom:10px;">Wi-Fi: ${wifiPass}</div>
            <div class="table-name">โต๊ะ: ${tableName}</div>
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://luxe-pos.app/order/${tableName}" />
            <p style="font-size:12px; margin-top:5px;">สแกนเพื่อสั่งอาหารด้วยตนเอง</p>
            <div class="footer">${message}</div>
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
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide flex-1">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => { setActiveCategory(cat.id); setSearchQuery(""); }}
                className={`relative px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors duration-300 ${
                  activeCategory === cat.id ? "text-white" : "text-slate-600 bg-white border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {activeCategory === cat.id && (
                  <motion.div layoutId="active-pill" className="absolute inset-0 bg-amber-500 rounded-full shadow-md shadow-amber-500/20" style={{ zIndex: -1 }} />
                )}
                <span className="relative z-10">{cat.name}</span>
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-64 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="ค้นหาเมนู..." 
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (activeCategory === "all") setActiveCategory(categories[1]?.id || "all");
              }}
              className="pl-10 rounded-full bg-white border-slate-200 shadow-sm" 
            />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto pb-10">
          {loading ? (
            <div className="h-full flex items-center justify-center text-slate-400">กำลังโหลดเมนู...</div>
          ) : (activeCategory === "all" && searchQuery === "") ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-6 content-start">
              {categories.filter(c => c.id !== 'all').map(cat => {
                const itemCount = menuItems.filter(m => m.category_id === cat.id).length;
                return (
                  <motion.div
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md cursor-pointer flex flex-col items-center justify-center gap-4 aspect-square transition-all"
                  >
                    <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center">
                       <span className="text-4xl">
                         {cat.name === 'ต้ม' ? '🍲' : cat.name === 'ผัด' ? '🥘' : cat.name === 'แกง' ? '🍛' : cat.name === 'ทอด' ? '🍤' : '🍹'}
                       </span>
                    </div>
                    <div className="text-center">
                      <h3 className="text-xl font-extrabold text-slate-800">{cat.name}</h3>
                      <p className="text-sm font-medium text-slate-400 mt-1">{itemCount} รายการ</p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col gap-4 h-full">
              {activeCategory !== "all" && (
                <button onClick={() => setActiveCategory("all")} className="flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-slate-800 w-fit">
                  <ChevronLeft className="w-4 h-4" /> ย้อนกลับไปหมวดหมู่
                </button>
              )}
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5 content-start">
                {filteredMenu.length === 0 ? (
                  <div className="col-span-full text-center text-slate-400 py-10 mt-10">ไม่พบเมนูอาหาร</div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {filteredMenu.map((item) => (
                      <motion.div
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.2 }}
                        key={item.id}
                        onClick={() => addToCart(item)}
                        className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3 group cursor-pointer"
                      >
                        <div className="aspect-square bg-slate-50 rounded-2xl p-4 flex items-center justify-center relative overflow-hidden group-hover:bg-amber-50 transition-colors">
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300" />
                        </div>
                        <div className="flex flex-col flex-1">
                          <h3 className="font-bold text-slate-800 line-clamp-2 leading-tight">{item.name}</h3>
                          <div className="mt-auto pt-3 flex items-center justify-between">
                            <span className="font-extrabold text-amber-600 text-lg">{formatCurrency(item.price)}</span>
                            <button className="w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center hover:bg-amber-500 transition-colors shadow-sm">
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="w-full lg:w-[320px] xl:w-[360px] shrink-0 flex flex-col bg-white border border-slate-100 rounded-3xl shadow-sm h-full overflow-hidden">
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <ShoppingCart className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-bold">ออเดอร์</h2>
          </div>
          <Badge className="bg-amber-500 text-white px-3 py-1 font-black border-0">โต๊ะ {tableName}</Badge>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3 opacity-60">
              <ShoppingCart className="w-12 h-12" />
              <p className="font-medium">ยังไม่มีรายการอาหาร</p>
            </div>
          ) : (
            <AnimatePresence>
              {cart.map((item) => (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  key={item.id} 
                  className="flex items-center justify-between border-b border-slate-100 pb-3"
                >
                  <div className="flex-1 min-w-0 pr-3">
                    <p className="font-bold text-slate-800 text-sm truncate">{item.name}</p>
                    <p className="text-sm font-bold text-amber-600 mt-1">{formatCurrency(item.price * item.quantity)}</p>
                  </div>
                  
                  <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-xl border border-slate-100 shrink-0">
                    <button onClick={() => updateQuantity(item.id, -1)} className="w-7 h-7 flex items-center justify-center bg-white rounded-lg shadow-sm text-slate-600 hover:text-rose-500">
                      {item.quantity === 1 ? <Trash2 className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                    </button>
                    <span className="text-sm font-bold text-slate-900 w-4 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="w-7 h-7 flex items-center justify-center bg-white rounded-lg shadow-sm text-slate-600 hover:text-emerald-500">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        <div className="p-5 bg-slate-50 border-t border-slate-100 flex flex-col gap-4 shrink-0">
          <div className="flex justify-between items-center text-sm font-semibold text-slate-500">
            <span>รวมทั้งหมด ({cartItemCount} รายการ)</span>
            <span className="text-slate-800 text-xl font-bold">{formatCurrency(cartTotal)}</span>
          </div>
          
          <div className="flex flex-col gap-3">
            <Button onClick={handlePrintQR} variant="outline" className="w-full h-12 rounded-xl border-sky-200 text-sky-600 hover:bg-sky-50 bg-white shadow-sm font-bold">
              <Printer className="w-4 h-4 mr-2" />
              พิมพ์ QR Code ให้ลูกค้าสั่งเอง
            </Button>
            
            <div className="flex gap-3">
              <Button onClick={() => setCart([])} variant="outline" className="w-14 h-14 rounded-2xl border-rose-200 text-rose-500 hover:bg-rose-50 shadow-sm bg-white">
                <Trash2 className="w-5 h-5" />
              </Button>
              <Button disabled={cart.length === 0} className="flex-1 h-14 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-lg shadow-lg shadow-amber-500/20 disabled:opacity-50">
                ส่งเข้าครัว (KDS)
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MenuPage() {
  return (
    // นี่คือ Suspense Boundary ที่ช่วยป้องกัน Error เวลาเรียกใช้ useSearchParams ของ Next.js
    <Suspense fallback={<div className="h-full flex items-center justify-center text-slate-500 font-bold">กำลังเตรียมหน้าจอ...</div>}>
      <MenuContent />
    </Suspense>
  );
}