import Announcements from "@/components/Announcements";
import BigCalendarContainer from "@/components/BigCalendarContainer";
import EventCalendar from "@/components/EventCalendar";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

const StudentPage = async () => {
  const { userId } = auth();

  const studentClass = userId
    ? await prisma.class.findFirst({
        where: { students: { some: { id: userId } } },
        select: { id: true, name: true },
      })
    : null;

  return (
    <div className="p-4 flex gap-4 flex-col xl:flex-row">
      {/* LEFT */}
      <div className="w-full xl:w-2/3">
        <div className="h-full bg-white p-4 rounded-md">
          {studentClass ? (
            <>
              <h1 className="text-xl font-semibold">
                Schedule ({studentClass.name})
              </h1>
              <BigCalendarContainer type="classId" id={studentClass.id} />
            </>
          ) : (
            <EmptyState
              title="No class assigned yet"
              body="Your account isn't linked to a class. Ask an admin to add you to a class so your schedule shows up here."
            />
          )}
        </div>
      </div>
      {/* RIGHT */}
      <div className="w-full xl:w-1/3 flex flex-col gap-8">
        <EventCalendar />
        <Announcements />
      </div>
    </div>
  );
};

const EmptyState = ({ title, body }: { title: string; body: string }) => (
  <div className="flex flex-col items-center justify-center text-center py-12 px-4">
    <div className="text-4xl mb-3">📚</div>
    <h2 className="text-lg font-semibold text-ink-900">{title}</h2>
    <p className="text-sm text-ink-500 mt-1 max-w-sm">{body}</p>
  </div>
);

export default StudentPage;
