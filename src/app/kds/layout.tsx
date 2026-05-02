import React from "react";
export default function KDSLayout({ children }: { children: React.ReactNode }) {
  // หน้าจอครัวมักจะใช้พื้นหลังสีเข้ม (Dark Mode) เพื่อถนอมสายตาและเห็นสีได้ชัดเจน
  return <div className="h-screen w-full bg-slate-950 text-slate-100 overflow-hidden font-sans">{children}</div>;
}