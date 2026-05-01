"use client";

import { setMyRole } from "@/lib/actions";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";

const roles = [
  {
    value: "teacher" as const,
    label: "Teacher",
    emoji: "👩‍🏫",
    desc: "Manage classes, lessons, exams, and grade students.",
  },
  {
    value: "student" as const,
    label: "Student",
    emoji: "🎓",
    desc: "View your timetable, assignments, exams, and results.",
  },
  {
    value: "parent" as const,
    label: "Parent",
    emoji: "👨‍👩‍👧",
    desc: "Track your child's attendance, grades, and announcements.",
  },
];

const OnboardingForm = ({ name }: { name: string }) => {
  const router = useRouter();
  const { user } = useUser();
  const [selected, setSelected] = useState<typeof roles[number]["value"] | null>(
    null
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    if (!selected) return;
    setPending(true);
    setError(null);
    const res = await setMyRole(selected);
    if (res.success) {
      // Reload Clerk user so publicMetadata propagates client-side
      await user?.reload();
      router.push(`/${res.role}`);
    } else {
      setError(res.error);
      setPending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-school-hero p-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[28rem] h-[28rem] rounded-full bg-pink-400/20 blur-3xl" />
      </div>

      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-soft p-8 sm:p-12 animate-slide-up">
        <div className="text-center mb-8">
          <p className="text-xs uppercase tracking-widest text-brand-600 font-semibold">
            One last step
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-ink-900 mt-2">
            Welcome, {name}! 👋
          </h1>
          <p className="text-ink-500 mt-2">
            Pick your role so we can set up the right dashboard for you.
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3 mb-4">
            {error}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          {roles.map((r) => {
            const active = selected === r.value;
            return (
              <button
                key={r.value}
                type="button"
                onClick={() => setSelected(r.value)}
                className={`text-left p-5 rounded-2xl ring-1 transition flex flex-col gap-2 ${
                  active
                    ? "ring-2 ring-brand-500 bg-brand-50 shadow-soft"
                    : "ring-ink-200 hover:ring-brand-300 hover:bg-brand-50/50"
                }`}
              >
                <span className="text-3xl">{r.emoji}</span>
                <span className="font-bold text-ink-900">{r.label}</span>
                <span className="text-xs text-ink-500 leading-relaxed">
                  {r.desc}
                </span>
              </button>
            );
          })}
        </div>

        <button
          onClick={handleContinue}
          disabled={!selected || pending}
          className="w-full bg-brand-gradient text-white font-semibold rounded-xl text-sm py-3 hover:opacity-95 active:opacity-90 transition shadow-glow disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pending ? "Setting up your dashboard…" : "Continue →"}
        </button>

        <p className="text-center text-xs text-ink-400 mt-4">
          Note: admins are created by existing administrators only.
        </p>
      </div>
    </div>
  );
};

export default OnboardingForm;
