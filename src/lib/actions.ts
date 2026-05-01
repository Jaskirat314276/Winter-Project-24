"use server";

import { revalidatePath } from "next/cache";
import {
  ClassSchema,
  ExamSchema,
  StudentSchema,
  SubjectSchema,
  TeacherSchema,
} from "./formValidationSchemas";
import prisma from "./prisma";
import { clerkClient } from "@clerk/nextjs/server";
import { AuthorizationError, requireRole } from "./auth";

type CurrentState = { success: boolean; error: boolean; message?: string };

function failure(err: unknown): CurrentState {
  if (err instanceof AuthorizationError) {
    return { success: false, error: true, message: err.message };
  }
  if (process.env.NODE_ENV !== "production") console.error(err);
  return { success: false, error: true };
}

export type SetRoleResult =
  | { success: true; role: "teacher" | "student" | "parent" }
  | { success: false; error: string };

export const setMyRole = async (
  role: "teacher" | "student" | "parent"
): Promise<SetRoleResult> => {
  const { auth } = await import("@clerk/nextjs/server");
  const { userId } = auth();
  if (!userId) return { success: false, error: "Not signed in." };
  if (!["teacher", "student", "parent"].includes(role)) {
    return { success: false, error: "Invalid role." };
  }
  try {
    const existing = await clerkClient.users.getUser(userId);
    if ((existing.publicMetadata as { role?: string })?.role) {
      return { success: false, error: "Role is already set on this account." };
    }
    await clerkClient.users.updateUser(userId, {
      publicMetadata: { role },
    });
    return { success: true, role };
  } catch (err: any) {
    return {
      success: false,
      error: err?.errors?.[0]?.message || err?.message || "Could not update role.",
    };
  }
};

export const createSubject = async (
  currentState: CurrentState,
  data: SubjectSchema
) => {
  try {
    requireRole("admin");
    await prisma.subject.create({
      data: {
        name: data.name,
        teachers: {
          connect: data.teachers.map((teacherId) => ({ id: teacherId })),
        },
      },
    });
    return { success: true, error: false };
  } catch (err) {
    return failure(err);
  }
};

export const updateSubject = async (
  currentState: CurrentState,
  data: SubjectSchema
) => {
  try {
    requireRole("admin");
    await prisma.subject.update({
      where: { id: data.id },
      data: {
        name: data.name,
        teachers: {
          set: data.teachers.map((teacherId) => ({ id: teacherId })),
        },
      },
    });
    return { success: true, error: false };
  } catch (err) {
    return failure(err);
  }
};

export const deleteSubject = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    requireRole("admin");
    await prisma.subject.delete({ where: { id: parseInt(id) } });
    return { success: true, error: false };
  } catch (err) {
    return failure(err);
  }
};

export const createClass = async (
  currentState: CurrentState,
  data: ClassSchema
) => {
  try {
    requireRole("admin");
    await prisma.class.create({ data });
    return { success: true, error: false };
  } catch (err) {
    return failure(err);
  }
};

export const updateClass = async (
  currentState: CurrentState,
  data: ClassSchema
) => {
  try {
    requireRole("admin");
    await prisma.class.update({ where: { id: data.id }, data });
    return { success: true, error: false };
  } catch (err) {
    return failure(err);
  }
};

export const deleteClass = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    requireRole("admin");
    await prisma.class.delete({ where: { id: parseInt(id) } });
    return { success: true, error: false };
  } catch (err) {
    return failure(err);
  }
};

export const createTeacher = async (
  currentState: CurrentState,
  data: TeacherSchema
) => {
  try {
    requireRole("admin");
    const user = await clerkClient.users.createUser({
      username: data.username,
      password: data.password,
      firstName: data.name,
      lastName: data.surname,
      publicMetadata: { role: "teacher" },
    });

    await prisma.teacher.create({
      data: {
        id: user.id,
        username: data.username,
        name: data.name,
        surname: data.surname,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address,
        img: data.img || null,
        bloodType: data.bloodType,
        sex: data.sex,
        birthday: data.birthday,
        subjects: {
          connect: data.subjects?.map((subjectId: string) => ({
            id: parseInt(subjectId),
          })),
        },
      },
    });
    return { success: true, error: false };
  } catch (err) {
    return failure(err);
  }
};

export const updateTeacher = async (
  currentState: CurrentState,
  data: TeacherSchema
) => {
  if (!data.id) return { success: false, error: true };
  try {
    requireRole("admin");
    await clerkClient.users.updateUser(data.id, {
      username: data.username,
      ...(data.password !== "" && { password: data.password }),
      firstName: data.name,
      lastName: data.surname,
    });

    await prisma.teacher.update({
      where: { id: data.id },
      data: {
        ...(data.password !== "" && { password: data.password }),
        username: data.username,
        name: data.name,
        surname: data.surname,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address,
        img: data.img || null,
        bloodType: data.bloodType,
        sex: data.sex,
        birthday: data.birthday,
        subjects: {
          set: data.subjects?.map((subjectId: string) => ({
            id: parseInt(subjectId),
          })),
        },
      },
    });
    return { success: true, error: false };
  } catch (err) {
    return failure(err);
  }
};

export const deleteTeacher = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    requireRole("admin");
    await clerkClient.users.deleteUser(id);
    await prisma.teacher.delete({ where: { id } });
    return { success: true, error: false };
  } catch (err) {
    return failure(err);
  }
};

export const createStudent = async (
  currentState: CurrentState,
  data: StudentSchema
) => {
  let createdClerkUserId: string | null = null;
  try {
    requireRole("admin");

    const user = await clerkClient.users.createUser({
      username: data.username,
      password: data.password,
      firstName: data.name,
      lastName: data.surname,
      publicMetadata: { role: "student" },
    });
    createdClerkUserId = user.id;

    // Re-check capacity inside a serializable transaction so two parallel
    // creates can't both squeak past the limit.
    await prisma.$transaction(
      async (tx) => {
        const klass = await tx.class.findUnique({
          where: { id: data.classId },
          include: { _count: { select: { students: true } } },
        });
        if (!klass) throw new Error("Class not found.");
        if (klass._count.students >= klass.capacity) {
          throw new AuthorizationError("Class is full.");
        }
        await tx.student.create({
          data: {
            id: user.id,
            username: data.username,
            name: data.name,
            surname: data.surname,
            email: data.email || null,
            phone: data.phone || null,
            address: data.address,
            img: data.img || null,
            bloodType: data.bloodType,
            sex: data.sex,
            birthday: data.birthday,
            gradeId: data.gradeId,
            classId: data.classId,
            parentId: data.parentId,
          },
        });
      },
      { isolationLevel: "Serializable" }
    );
    return { success: true, error: false };
  } catch (err) {
    // Compensate: roll back the Clerk user we created if Prisma rejected.
    if (createdClerkUserId) {
      try {
        await clerkClient.users.deleteUser(createdClerkUserId);
      } catch {
        /* best-effort cleanup */
      }
    }
    return failure(err);
  }
};

export const updateStudent = async (
  currentState: CurrentState,
  data: StudentSchema
) => {
  if (!data.id) return { success: false, error: true };
  try {
    requireRole("admin");
    await clerkClient.users.updateUser(data.id, {
      username: data.username,
      ...(data.password !== "" && { password: data.password }),
      firstName: data.name,
      lastName: data.surname,
    });

    await prisma.student.update({
      where: { id: data.id },
      data: {
        ...(data.password !== "" && { password: data.password }),
        username: data.username,
        name: data.name,
        surname: data.surname,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address,
        img: data.img || null,
        bloodType: data.bloodType,
        sex: data.sex,
        birthday: data.birthday,
        gradeId: data.gradeId,
        classId: data.classId,
        parentId: data.parentId,
      },
    });
    return { success: true, error: false };
  } catch (err) {
    return failure(err);
  }
};

export const deleteStudent = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    requireRole("admin");
    await clerkClient.users.deleteUser(id);
    await prisma.student.delete({ where: { id } });
    return { success: true, error: false };
  } catch (err) {
    return failure(err);
  }
};

export const createExam = async (
  currentState: CurrentState,
  data: ExamSchema
) => {
  try {
    const { userId, role } = requireRole("admin", "teacher");

    if (role === "teacher") {
      const teacherLesson = await prisma.lesson.findFirst({
        where: { teacherId: userId, id: data.lessonId },
      });
      if (!teacherLesson) {
        throw new AuthorizationError(
          "You can only create exams for your own lessons."
        );
      }
    }

    await prisma.exam.create({
      data: {
        title: data.title,
        startTime: data.startTime,
        endTime: data.endTime,
        lessonId: data.lessonId,
      },
    });
    return { success: true, error: false };
  } catch (err) {
    return failure(err);
  }
};

export const updateExam = async (
  currentState: CurrentState,
  data: ExamSchema
) => {
  try {
    const { userId, role } = requireRole("admin", "teacher");

    if (role === "teacher") {
      const teacherLesson = await prisma.lesson.findFirst({
        where: { teacherId: userId, id: data.lessonId },
      });
      if (!teacherLesson) {
        throw new AuthorizationError(
          "You can only edit exams for your own lessons."
        );
      }
    }

    await prisma.exam.update({
      where: { id: data.id },
      data: {
        title: data.title,
        startTime: data.startTime,
        endTime: data.endTime,
        lessonId: data.lessonId,
      },
    });
    return { success: true, error: false };
  } catch (err) {
    return failure(err);
  }
};

export const deleteExam = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;

  try {
    const { userId, role } = requireRole("admin", "teacher");
    await prisma.exam.delete({
      where: {
        id: parseInt(id),
        ...(role === "teacher" ? { lesson: { teacherId: userId } } : {}),
      },
    });
    return { success: true, error: false };
  } catch (err) {
    return failure(err);
  }
};
