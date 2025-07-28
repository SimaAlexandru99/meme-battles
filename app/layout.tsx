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

function Header() {
  return (
    <header className="absolute top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center">
          <Image
            src="/logo.png"
            alt="MEME BATTLES"
            width={120}
            height={48}
            className="drop-shadow-lg"
            priority
          />
        </div>

        {/* Sign In Button */}
        <Button
          variant="outline"
          className="border-white/30 text-white hover:bg-white/10 hover:border-white/50 transition-all duration-200 font-bangers tracking-wide backdrop-blur-sm"
        >
          <RiLoginBoxLine className="w-4 h-4 mr-2" />
          Sign In
        </Button>
      </div>
    </header>
  );
}

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
