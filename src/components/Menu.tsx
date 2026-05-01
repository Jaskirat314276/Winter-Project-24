import { getCachedCurrentUser } from "@/lib/auth";
import Image from "next/image";
import Link from "next/link";
import LogoutButton from "./LogoutButton";

const menuItems = [
  {
    title: "MENU",
    items: [
      { icon: "/home.png", label: "Home", href: "/", visible: ["admin", "teacher", "student", "parent"] },
      { icon: "/teacher.png", label: "Teachers", href: "/list/teachers", visible: ["admin", "teacher"] },
      { icon: "/student.png", label: "Students", href: "/list/students", visible: ["admin", "teacher"] },
      { icon: "/parent.png", label: "Parents", href: "/list/parents", visible: ["admin", "teacher"] },
      { icon: "/subject.png", label: "Subjects", href: "/list/subjects", visible: ["admin"] },
      { icon: "/class.png", label: "Classes", href: "/list/classes", visible: ["admin", "teacher"] },
      { icon: "/lesson.png", label: "Lessons", href: "/list/lessons", visible: ["admin", "teacher"] },
      { icon: "/exam.png", label: "Exams", href: "/list/exams", visible: ["admin", "teacher", "student", "parent"] },
      { icon: "/assignment.png", label: "Assignments", href: "/list/assignments", visible: ["admin", "teacher", "student", "parent"] },
      { icon: "/result.png", label: "Results", href: "/list/results", visible: ["admin", "teacher", "student", "parent"] },
      { icon: "/attendance.png", label: "Attendance", href: "/list/attendance", visible: ["admin", "teacher", "student", "parent"] },
      { icon: "/calendar.png", label: "Events", href: "/list/events", visible: ["admin", "teacher", "student", "parent"] },
      { icon: "/message.png", label: "Messages", href: "/list/messages", visible: ["admin", "teacher", "student", "parent"] },
      { icon: "/announcement.png", label: "Announcements", href: "/list/announcements", visible: ["admin", "teacher", "student", "parent"] },
    ],
  },
  {
    title: "OTHER",
    items: [
      { icon: "/profile.png", label: "Profile", href: "/profile", visible: ["admin", "teacher", "student", "parent"] },
      { icon: "/setting.png", label: "Settings", href: "/settings", visible: ["admin", "teacher", "student", "parent"] },
      { icon: "/logout.png", label: "Logout", href: "/logout", visible: ["admin", "teacher", "student", "parent"] },
    ],
  },
];

const roleColors: Record<string, string> = {
  admin: "bg-rose-100 text-rose-700",
  teacher: "bg-brand-100 text-brand-700",
  student: "bg-emerald-100 text-emerald-700",
  parent: "bg-amber-100 text-amber-700",
};

const Menu = async () => {
  const user = await getCachedCurrentUser();
  const role = (user?.publicMetadata?.role as string) || "";
  const fullName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.username ||
    "User";

  return (
    <div className="mt-6 text-sm flex flex-col gap-1">
      {/* Mini user card on top */}
      <div className="hidden lg:flex items-center gap-3 p-3 rounded-2xl bg-brand-gradient-soft border border-brand-100 mb-4">
        <Image
          src={user?.imageUrl || "/avatar.png"}
          alt="avatar"
          width={36}
          height={36}
          className="rounded-full ring-2 ring-white shadow-sm"
        />
        <div className="flex flex-col min-w-0">
          <span className="font-semibold text-ink-900 truncate text-xs">
            {fullName}
          </span>
          <span
            className={`inline-flex w-fit text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${
              roleColors[role] || "bg-ink-100 text-ink-700"
            }`}
          >
            {role || "guest"}
          </span>
        </div>
      </div>

      {menuItems.map((section) => (
        <div className="flex flex-col gap-0.5" key={section.title}>
          <span className="hidden lg:block text-[10px] tracking-[0.2em] text-ink-400 font-semibold mt-4 mb-2 px-2">
            {section.title}
          </span>
          {section.items.map((item) => {
            if (!item.visible.includes(role)) return null;
            if (item.label === "Logout") {
              return <LogoutButton key={item.label} />;
            }
            return (
              <Link
                href={item.href}
                key={item.label}
                className="group flex items-center justify-center lg:justify-start gap-3 text-ink-500 py-2.5 px-2 lg:px-3 rounded-lg hover:bg-brand-50 hover:text-brand-700 transition-colors"
              >
                <span className="w-5 h-5 flex items-center justify-center">
                  <Image src={item.icon} alt="" width={18} height={18} />
                </span>
                <span className="hidden lg:block font-medium">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default Menu;
