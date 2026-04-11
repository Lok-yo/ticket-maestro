import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TicketMaestro - Anticípate a tus eventos",
  description: "Compra boletos para los mejores eventos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`h-full antialiased`}
    >
      <body className={`${outfit.className} min-h-full flex flex-col`}>{children}</body>
    </html>
  );
}
