import { currentUser } from "@clerk/nextjs/server";
import Image from "next/image";

const ProfilePage = async () => {
  const user = await currentUser();
  const role = (user?.publicMetadata?.role as string) || "user";

  return (
    <div className="p-4 m-4 bg-white rounded-md flex-1">
      <h1 className="text-xl font-semibold mb-6">Profile</h1>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        <Image
          src={user?.imageUrl || "/avatar.png"}
          alt="avatar"
          width={120}
          height={120}
          className="rounded-full ring-2 ring-gray-200"
        />

        <div className="flex flex-col gap-3 text-sm flex-1">
          <Row label="Name" value={`${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || "—"} />
          <Row label="Username" value={user?.username || "—"} />
          <Row label="Email" value={user?.primaryEmailAddress?.emailAddress || "—"} />
          <Row label="Role" value={role} capitalize />
          <Row
            label="Joined"
            value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}
          />
        </div>
      </div>
    </div>
  );
};

const Row = ({
  label,
  value,
  capitalize,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) => (
  <div className="flex gap-4">
    <span className="w-24 text-gray-400">{label}</span>
    <span className={capitalize ? "capitalize" : ""}>{value}</span>
  </div>
);

export default ProfilePage;
