import React from "react";
import TableMap from "@/components/pos/TableMap";

export default function PosHomePage() {
  return (
    <div className="h-full w-full">
      {/* ดึงแผนผังโต๊ะมาแสดง */}
      <TableMap />
    </div>
  );
}