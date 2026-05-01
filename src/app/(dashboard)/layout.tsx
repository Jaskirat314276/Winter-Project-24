import Menu from "@/components/Menu";
import Navbar from "@/components/Navbar";
import Image from "next/image";
import Link from "next/link";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="h-screen flex bg-ink-50">
      {/* LEFT — Sidebar */}
      <aside className="w-[14%] md:w-[8%] lg:w-[20%] xl:w-[16%] bg-white border-r border-ink-100 p-4 overflow-y-auto">
        <Link
          href="/"
          className="flex items-center justify-center lg:justify-start gap-3 px-2 py-2"
        >
          <div className="w-10 h-10 rounded-xl bg-brand-gradient flex items-center justify-center shadow-glow">
            <Image src="/logo.png" alt="logo" width={22} height={22} />
          </div>
          <div className="hidden lg:flex flex-col leading-tight">
            <span className="text-[10px] uppercase tracking-widest text-ink-400 font-semibold">
              Smart School
            </span>
            <span className="font-bold text-ink-900">ERP</span>
          </div>
        </Link>
        <Menu />
      </aside>

      {/* RIGHT — Main */}
      <main className="w-[86%] md:w-[92%] lg:w-[80%] xl:w-[84%] flex flex-col overflow-y-auto">
        <Navbar />
        <div className="animate-fade-in">{children}</div>
      </main>
    </div>
  );
}
