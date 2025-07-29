import type { Metadata } from "next";
import { Bangers } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/providers/theme-provider";
import { Button } from "@/components/ui/button";
import { RiLoginBoxLine } from "react-icons/ri";
import Image from "next/image";

const bangers = Bangers({
  variable: "--font-bangers",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Meme Battles - Epic Meme Wars",
  description:
    "Create, vote, and laugh with friends in real-time meme battles! AI-generated situations meet your creativity in this hilarious meme game.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${bangers.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
