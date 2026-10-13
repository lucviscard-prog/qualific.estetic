export const BUSINESS_TIME_ZONE = "America/Sao_Paulo";

export function businessDay(value = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(value);
  const get = (type: string) => parts.find(part => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function paymentMonth(paidAt: string | null): string | null {
  if (!paidAt || Number.isNaN(Date.parse(paidAt))) return null;
  return businessDay(new Date(paidAt)).slice(0, 7);
}

export function validMileage(value: string): boolean {
  return value.trim() !== "" && Number.isSafeInteger(Number(value)) && Number(value) >= 0;
}

export function validVehicleYear(value: string): boolean {
  return Number.isInteger(Number(value)) && Number(value) >= 1900 && Number(value) <= new Date().getFullYear() + 1;
}

export function normalizePlate(value: string): string {
  return value.replace(/[\s-]/g, "").toUpperCase();
}

export function validPhoto(file: {size: number; type: string}): boolean {
  return file.size > 0 && file.size <= 10 * 1024 * 1024 && ["image/jpeg", "image/png", "image/webp"].includes(file.type);
}

export function relationRows<T>(value: T | T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : value ? [value] : [];
}
