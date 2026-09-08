import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppInit from "@/components/AppInit";

export const metadata: Metadata = {
  title: "Minha Agenda",
  description: "Seu dia. Suas tarefas. Seu foco. 100% offline.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0b0b10",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <AppInit />
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
