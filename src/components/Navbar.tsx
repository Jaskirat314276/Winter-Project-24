import { UserButton } from "@clerk/nextjs";
import { getCachedCurrentUser } from "@/lib/auth";
import Image from "next/image";

const greetingFor = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

const Navbar = async () => {
  const user = await getCachedCurrentUser();
  const role = (user?.publicMetadata?.role as string) || "user";
  const name = user?.firstName || user?.username || "there";

  return (
    <div className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-ink-100">
      <div className="flex items-center justify-between px-4 md:px-6 py-3 gap-4">
        {/* Greeting */}
        <div className="hidden md:flex flex-col">
          <span className="text-[11px] uppercase tracking-widest text-ink-400 font-semibold">
            {greetingFor()}
          </span>
          <span className="text-sm font-semibold text-ink-900">
            Welcome, {name} 👋
          </span>
        </div>

        {/* SEARCH BAR */}
        <div className="flex-1 max-w-md">
          <div className="flex items-center gap-2 text-sm rounded-full bg-ink-50 ring-1 ring-transparent focus-within:ring-brand-300 focus-within:bg-white transition px-4 py-2">
            <Image src="/search.png" alt="" width={14} height={14} />
            <input
              type="text"
              placeholder="Search students, teachers, classes…"
              className="w-full bg-transparent outline-none placeholder:text-ink-400"
            />
            <kbd className="hidden md:inline text-[10px] text-ink-400 bg-white border border-ink-200 rounded px-1.5 py-0.5">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* ICONS AND USER */}
        <div className="flex items-center gap-3">
          <button
            aria-label="Messages"
            className="hidden sm:flex bg-ink-50 hover:bg-brand-50 rounded-full w-9 h-9 items-center justify-center transition"
          >
            <Image src="/message.png" alt="" width={18} height={18} />
          </button>
          <button
            aria-label="Announcements"
            className="bg-ink-50 hover:bg-brand-50 rounded-full w-9 h-9 flex items-center justify-center relative transition"
          >
            <Image src="/announcement.png" alt="" width={18} height={18} />
            <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center bg-rose-500 text-white rounded-full text-[10px] font-bold ring-2 ring-white">
              1
            </span>
          </button>

          <div className="hidden sm:flex flex-col items-end pl-2 border-l border-ink-100 ml-1">
            <span className="text-xs font-semibold text-ink-900 leading-tight">
              {[user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
                user?.username ||
                "User"}
            </span>
            <span className="text-[10px] text-brand-600 capitalize font-medium">
              {role}
            </span>
          </div>
          <UserButton
            appearance={{
              elements: { avatarBox: "w-9 h-9 ring-2 ring-brand-100" },
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Navbar;
