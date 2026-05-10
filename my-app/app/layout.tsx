import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { GlobalAuthCorner } from "./components/GlobalAuthCorner";
import { ProductImagesProvider } from "./components/ProductImageContext";
import { AuthProvider } from "./contexts/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Keyrambit Inventory",
  description: "Futuristic blind box opening and inventory system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <ProductImagesProvider>
            <GlobalAuthCorner />
            {children}
          </ProductImagesProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
