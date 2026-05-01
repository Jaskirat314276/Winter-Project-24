import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { auth } from "@clerk/nextjs/server";
import { Prisma } from "@prisma/client";
import Image from "next/image";

type AttendanceRow = {
  id: number;
  date: Date;
  present: boolean;
  studentName: string;
  studentSurname: string;
  lessonName: string;
  className: string;
};

const AttendanceListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  const { userId, sessionClaims } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  const currentUserId = userId;

  const columns = [
    { header: "Date", accessor: "date" },
    { header: "Student", accessor: "student" },
    { header: "Lesson", accessor: "lesson", className: "hidden md:table-cell" },
    { header: "Class", accessor: "class", className: "hidden md:table-cell" },
    { header: "Status", accessor: "status" },
  ];

  const renderRow = (item: AttendanceRow) => (
    <tr
      key={item.id}
      className="border-b border-ink-100 even:bg-ink-50/50 text-sm hover:bg-brand-50 transition-colors"
    >
      <td className="p-4 font-medium text-ink-700">
        {new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }).format(item.date)}
      </td>
      <td className="text-ink-700">
        {item.studentName} {item.studentSurname}
      </td>
      <td className="hidden md:table-cell text-ink-500">{item.lessonName}</td>
      <td className="hidden md:table-cell text-ink-500">{item.className}</td>
      <td>
        {item.present ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Present
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Absent
          </span>
        )}
      </td>
    </tr>
  );

  const { page, ...queryParams } = searchParams;
  const p = page ? parseInt(page) : 1;

  const query: Prisma.AttendanceWhereInput = {};

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {
          case "studentId":
            query.studentId = value;
            break;
          case "search":
            query.OR = [
              { student: { name: { contains: value, mode: "insensitive" } } },
              { student: { surname: { contains: value, mode: "insensitive" } } },
              { lesson: { name: { contains: value, mode: "insensitive" } } },
            ];
            break;
          default:
            break;
        }
      }
    }
  }

  switch (role) {
    case "admin":
      break;
    case "teacher":
      query.lesson = { teacherId: currentUserId! };
      break;
    case "student":
      query.studentId = currentUserId!;
      break;
    case "parent":
      query.student = { parentId: currentUserId! };
      break;
    default:
      break;
  }

  const [rows, count, presentCount] = await prisma.$transaction([
    prisma.attendance.findMany({
      where: query,
      include: {
        student: { select: { name: true, surname: true } },
        lesson: {
          select: {
            name: true,
            class: { select: { name: true } },
          },
        },
      },
      orderBy: { date: "desc" },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.attendance.count({ where: query }),
    prisma.attendance.count({ where: { ...query, present: true } }),
  ]);
  const totalCount = count;

  const data: AttendanceRow[] = rows.map((r) => ({
    id: r.id,
    date: r.date,
    present: r.present,
    studentName: r.student.name,
    studentSurname: r.student.surname,
    lessonName: r.lesson.name,
    className: r.lesson.class.name,
  }));

  const presentRate =
    totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  return (
    <div className="p-4 m-4 mt-0 flex flex-col gap-4">
      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Total Records"
          value={totalCount.toString()}
          gradient="from-brand-500 to-brand-700"
          emoji="📋"
        />
        <StatCard
          label="Present"
          value={presentCount.toString()}
          gradient="from-emerald-500 to-teal-600"
          emoji="✅"
        />
        <StatCard
          label="Attendance Rate"
          value={`${presentRate}%`}
          gradient="from-amber-500 to-orange-600"
          emoji="📈"
        />
      </div>

      {/* Table */}
      <div className="bg-white p-4 rounded-2xl shadow-soft border border-ink-100">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-lg font-semibold text-ink-900">
            Attendance Records
          </h1>
          <div className="flex items-center gap-3">
            <TableSearch />
            <button
              aria-label="Filter"
              className="w-9 h-9 flex items-center justify-center rounded-full bg-ink-50 hover:bg-brand-50 transition"
            >
              <Image src="/filter.png" alt="" width={14} height={14} />
            </button>
            <button
              aria-label="Sort"
              className="w-9 h-9 flex items-center justify-center rounded-full bg-ink-50 hover:bg-brand-50 transition"
            >
              <Image src="/sort.png" alt="" width={14} height={14} />
            </button>
          </div>
        </div>

        {data.length === 0 ? (
          <div className="text-center text-ink-400 py-16">
            <p className="text-3xl mb-2">📭</p>
            <p className="text-sm">No attendance records yet.</p>
          </div>
        ) : (
          <>
            <Table columns={columns} renderRow={renderRow} data={data} />
            <Pagination page={p} count={count} />
          </>
        )}
      </div>
    </div>
  );
};

const StatCard = ({
  label,
  value,
  gradient,
  emoji,
}: {
  label: string;
  value: string;
  gradient: string;
  emoji: string;
}) => (
  <div
    className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-5 text-white shadow-soft`}
  >
    <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/10 blur-xl" />
    <div className="relative flex items-start justify-between">
      <span className="text-xs font-semibold uppercase tracking-wider text-white/80">
        {label}
      </span>
      <span className="text-2xl">{emoji}</span>
    </div>
    <p className="relative text-3xl font-bold mt-4">{value}</p>
  </div>
);

export default AttendanceListPage;
