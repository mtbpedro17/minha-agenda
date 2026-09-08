import Link from "next/link";
import { Plus } from "lucide-react";

export default function FloatingButton({ href }: { href: string }) {
  return (
    <Link
      href={href}
      aria-label="Criar novo"
      className="fixed bottom-24 right-5 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-accent/30 transition-transform active:scale-95"
    >
      <Plus size={26} strokeWidth={2.5} />
    </Link>
  );
}
