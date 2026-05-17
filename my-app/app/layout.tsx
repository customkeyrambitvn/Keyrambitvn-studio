import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { GlobalAuthCorner } from "./components/GlobalAuthCorner";
import { ProductImagesProvider } from "./components/ProductImageContext";
import { AuthProvider } from "./contexts/AuthContext";
import { SfxProvider } from "./contexts/SfxContext";

const beVietnam = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Keyrambitvn",
  description: "Keyrambitvn",
  icons: {
    icon: "/keyrambitvn-favicon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${beVietnam.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <AuthProvider>
          <SfxProvider>
            <ProductImagesProvider>
              <GlobalAuthCorner />
              {children}
            </ProductImagesProvider>
          </SfxProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
