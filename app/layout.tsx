import type { Metadata } from "next";
import { Bangers } from "next/font/google";
import "./globals.css";
import { Suspense } from "react";
import { InvitationLink } from "@/components/invitation-link";
import { Toaster } from "@/components/ui/sonner";
import { SWRProvider } from "@/providers/swr-provider";
import { ThemeProvider } from "@/providers/theme-provider";

const bangers = Bangers({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bangers",
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
        <SWRProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <Suspense fallback={null}>
              <InvitationLink>{children}</InvitationLink>
            </Suspense>
            <Toaster />
          </ThemeProvider>
        </SWRProvider>
      </body>
    </html>
  );
}
