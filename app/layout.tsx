import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Qualific.Estetic | Estética Automotiva",
  description: "Agende, acompanhe e cuide do seu veículo com a Qualific.Estetic.",
};

export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}