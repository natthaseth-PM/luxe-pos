"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import { Search, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/formatters";
import { Button } from "@/components/ui/button";

export default function MenuPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      // ดึงข้อมูลหมวดหมู่
      const { data: cats } = await supabase.from("categories").select("*").order("sort_order");
      if (cats) setCategories([{ id: "all", name: "ทั้งหมด" }, ...cats]);

      // ดึงข้อมูลเมนูอาหาร
      const { data: items } = await supabase.from("menu_items").select("*");
      if (items) setMenuItems(items);
      setLoading(false);
    };
    fetchData();
  }, []);

  // กรองเมนูตามหมวดหมู่ที่เลือก
  const filteredMenu = activeCategory === "all" 
    ? menuItems 
    : menuItems.filter(item => item.category_id === activeCategory);

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full text-slate-800">
      
      {/* ======== ฝั่งซ้าย/กลาง: หมวดหมู่ และ เมนูอาหาร ======== */}
      <div className="flex-1 flex flex-col gap-6 h-full overflow-hidden">
        <header className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`relative px-6 py-3 rounded-full text-sm font-bold whitespace-nowrap transition-colors duration-300 ${
                  activeCategory === cat.id ? "text-white" : "text-slate-500 bg-white border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {activeCategory === cat.id && (
                  <motion.div layoutId="active-pill" className="absolute inset-0 bg-amber-500 rounded-full shadow-md shadow-amber-500/20" style={{ zIndex: -1 }} />
                )}
                <span className="relative z-10">{cat.name}</span>
              </button>
            ))}
          </div>

          <div className="relative w-64 hidden xl:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="ค้นหาเมนู..." className="pl-10 rounded-full bg-white border-slate-200" />
          </div>
        </header>

        {/* Grid เมนูอาหาร */}
        <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5 pb-10 content-start">
          {loading ? (
            <div className="col-span-full text-center text-slate-400 py-10">กำลังโหลดเมนู...</div>
          ) : (
            filteredMenu.map((item) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                key={item.id}
                className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3 group cursor-pointer"
              >
                <div className="aspect-square bg-slate-50 rounded-2xl p-4 flex items-center justify-center relative overflow-hidden group-hover:bg-amber-50 transition-colors">
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300" />
                </div>
                <div className="flex flex-col flex-1">
                  <h3 className="font-bold text-slate-800 line-clamp-2 leading-tight">{item.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-1">{item.description}</p>
                  <div className="mt-auto pt-3 flex items-center justify-between">
                    <span className="font-extrabold text-amber-600 text-lg">{formatCurrency(item.price)}</span>
                    <button className="w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center hover:bg-amber-500 transition-colors shadow-sm">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* ======== ฝั่งขวา: ตะกร้าสินค้า (Cart) ======== */}
      <div className="w-full lg:w-[320px] xl:w-[360px] shrink-0 flex flex-col bg-white border border-slate-100 rounded-3xl shadow-sm h-full overflow-hidden">
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShoppingCart className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-bold">ออเดอร์ใหม่</h2>
          </div>
          <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-semibold">โต๊ะ T1</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
           {/* Mock Data สำหรับหน้าตา UI ก่อน */}
          <div className="flex justify-between items-start border-b border-slate-100 pb-4">
            <div>
              <p className="font-bold text-slate-800">ต้มยำกุ้งแม่น้ำน้ำข้น</p>
              <p className="text-sm text-slate-500 mt-0.5">{formatCurrency(250)} x 1</p>
            </div>
            <p className="font-bold text-slate-900">{formatCurrency(250)}</p>
          </div>
          <div className="flex justify-between items-start border-b border-slate-100 pb-4">
            <div>
              <p className="font-bold text-slate-800">หมูสามชั้นทอดน้ำปลา</p>
              <p className="text-sm text-slate-500 mt-0.5">{formatCurrency(120)} x 2</p>
            </div>
            <p className="font-bold text-slate-900">{formatCurrency(240)}</p>
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col gap-4">
          <div className="flex justify-between items-center text-sm font-semibold text-slate-500">
            <span>รวมทั้งหมด (3 รายการ)</span>
            <span className="text-slate-800 text-lg font-bold">{formatCurrency(490)}</span>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="w-14 h-14 rounded-2xl border-rose-200 text-rose-500 hover:bg-rose-50">
              <Trash2 className="w-5 h-5" />
            </Button>
            <Button className="flex-1 h-14 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-lg shadow-lg shadow-amber-500/20">
              ส่งเข้าครัว (KDS)
            </Button>
          </div>
        </div>
      </div>

    </div>
  );
}