import type React from "react";
import type { Metadata } from "next";
import { DM_Sans, Inconsolata } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/providers/theme-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { ModelsProvider } from "@/providers/models-provider";
import { ReportProvider } from "@/providers/report-provider";
import { PostHogProvider } from "@/providers/posthog-provider";
import { NotificationProvider } from "@/providers/notification-provider";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const inconsolata = Inconsolata({
  subsets: ["latin"],
  variable: "--font-inconsolata",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mint",
  description:
    "Discover what AI models tell about your brand. Get actionable insights on how AI perceives your brand.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${dmSans.variable} ${inconsolata.variable} font-sans`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <PostHogProvider>
            <AuthProvider>
              <ModelsProvider>
                <NotificationProvider>
                  <ReportProvider>
                    {children}
                  </ReportProvider>
                </NotificationProvider>
              </ModelsProvider>
            </AuthProvider>
          </PostHogProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}