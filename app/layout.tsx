import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ToastContainer";

export const metadata: Metadata = {
  title: "SplitMate",
  description: "Split expenses with friends",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}

