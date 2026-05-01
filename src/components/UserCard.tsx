import prisma from "@/lib/prisma";
import Image from "next/image";

const cardStyles: Record<
  "admin" | "teacher" | "student" | "parent",
  { gradient: string; icon: string; pillBg: string; pillText: string; emoji: string }
> = {
  admin: {
    gradient: "from-rose-500 to-pink-600",
    icon: "/profile.png",
    pillBg: "bg-white/20",
    pillText: "text-white",
    emoji: "🛡️",
  },
  teacher: {
    gradient: "from-brand-500 to-brand-700",
    icon: "/teacher.png",
    pillBg: "bg-white/20",
    pillText: "text-white",
    emoji: "👩‍🏫",
  },
  student: {
    gradient: "from-emerald-500 to-teal-600",
    icon: "/student.png",
    pillBg: "bg-white/20",
    pillText: "text-white",
    emoji: "🎓",
  },
  parent: {
    gradient: "from-amber-500 to-orange-600",
    icon: "/parent.png",
    pillBg: "bg-white/20",
    pillText: "text-white",
    emoji: "👨‍👩‍👧",
  },
};

const UserCard = async ({
  type,
}: {
  type: "admin" | "teacher" | "student" | "parent";
}) => {
  const modelMap: Record<typeof type, any> = {
    admin: prisma.admin,
    teacher: prisma.teacher,
    student: prisma.student,
    parent: prisma.parent,
  };

  const data = await modelMap[type].count();
  const style = cardStyles[type];

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${style.gradient} p-5 flex-1 min-w-[150px] text-white shadow-soft hover:shadow-glow transition-shadow`}
    >
      <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10 blur-xl" />
      <div className="relative flex justify-between items-start">
        <span
          className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${style.pillBg} ${style.pillText}`}
        >
          2024/25
        </span>
        <div className="text-2xl">{style.emoji}</div>
      </div>
      <h1 className="relative text-3xl font-bold mt-6">{data}</h1>
      <h2 className="relative capitalize text-sm font-medium text-white/85 mt-1">
        {type}s
      </h2>
    </div>
  );
};

export default UserCard;
