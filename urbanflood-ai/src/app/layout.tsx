import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "maplibre-gl/dist/maplibre-gl.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CityProvider } from "@/context/city-context";
import { RiskProvider } from "@/context/risk-context";
import { AppShell } from "@/components/layout/app-shell";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "UrbanFlood AI — Urban Flood Nowcasting Platform",
  description:
    "India-ready, city-scalable urban flood intelligence platform. Real-time flood nowcasting through drainage and rainfall coupling. SIH26085 — Ministry of Earth Sciences.",
  keywords: [
    "urban flood",
    "nowcasting",
    "flood prediction",
    "drainage",
    "rainfall",
    "India",
    "disaster management",
    "GIS",
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <CityProvider>
          <RiskProvider>
            <TooltipProvider delay={200}>
              <AppShell>{children}</AppShell>
            </TooltipProvider>
          </RiskProvider>
        </CityProvider>
      </body>
    </html>
  );
}
