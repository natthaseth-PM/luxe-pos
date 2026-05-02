// ฟังก์ชันแปลงตัวเลขเป็นสกุลเงินบาท (เช่น 1250 -> ฿1,250.00)
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 2
  }).format(amount);
}