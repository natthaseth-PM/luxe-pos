import React from "react";
import TableManagementView from "@/components/pos/TableManagementView";

export default function PosHomePage() {
  return (
    <div className="h-full w-full">
      {/* ดึงโครงสร้างหน้า Table Management แบบพรีเมียมมาแสดง */}
      <TableManagementView />
    </div>
  );
}