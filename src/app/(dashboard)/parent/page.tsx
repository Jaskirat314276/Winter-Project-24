import Announcements from "@/components/Announcements";
import BigCalendarContainer from "@/components/BigCalendarContainer";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

const ParentPage = async () => {
  const { userId } = auth();
  const currentUserId = userId;
  
  const students = await prisma.student.findMany({
    where: {
      parentId: currentUserId!,
    },
  });

  return (
    <div className="flex-1 p-4 flex gap-4 flex-col xl:flex-row">
      {/* LEFT */}
      <div className="w-full xl:w-2/3">
        {students.length === 0 ? (
          <div className="bg-white p-4 rounded-md flex flex-col items-center justify-center text-center py-12">
            <div className="text-4xl mb-3">👨‍👩‍👧</div>
            <h2 className="text-lg font-semibold text-ink-900">
              No children linked to this account
            </h2>
            <p className="text-sm text-ink-500 mt-1 max-w-sm">
              Ask an admin to link your students to your parent account so their
              schedules show up here.
            </p>
          </div>
        ) : (
          students.map((student) => (
            <div key={student.id} className="mb-4">
              <div className="h-full bg-white p-4 rounded-md">
                <h1 className="text-xl font-semibold">
                  Schedule ({student.name + " " + student.surname})
                </h1>
                <BigCalendarContainer type="classId" id={student.classId} />
              </div>
            </div>
          ))
        )}
      </div>
      {/* RIGHT */}
      <div className="w-full xl:w-1/3 flex flex-col gap-8">
        <Announcements />
      </div>
    </div>
  );
};

export default ParentPage;
