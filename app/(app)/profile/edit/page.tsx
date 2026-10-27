import Link from "next/link";
import { removeAvatar, updateProfile } from "@/lib/actions/profile";
import { Avatar } from "@/components/Avatar";
import { AvatarUpload } from "@/components/AvatarUpload";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit profile" };

export default async function EditProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = (await currentUser())!;
  const { error } = await searchParams;

  return (
    <div className="max-w-2xl mx-auto">
      <Link href={`/profile/${user.id}`} className="link small">
        ← Back to profile
      </Link>

      <div className="card card-pad mt-3">
        <h1 className="text-xl font-bold mb-4">Edit profile</h1>

        {error === "name" && (
          <div className="alert alert-error" role="alert" data-testid="profile-error">
            Your name is required.
          </div>
        )}
        {error === "avatar" && (
          <div className="alert alert-error" role="alert">
            That image couldn’t be applied. Try uploading it again.
          </div>
        )}

        <div className="flex items-center gap-4 mb-5 pb-5 border-b border-[color:var(--line)]">
          <Avatar name={user.name} srcKey={user.avatar_key} size={80} />
          <div className="flex flex-col gap-2 items-start">
            <AvatarUpload />
            {user.avatar_key && (
              <form action={removeAvatar}>
                <button className="btn btn-ghost btn-sm" type="submit">
                  Remove photo
                </button>
              </form>
            )}
          </div>
        </div>

        <form action={updateProfile} className="flex flex-col gap-4" data-testid="profile-form">
          <div>
            <label className="label" htmlFor="name">
              Full name *
            </label>
            <input
              className="input"
              id="name"
              name="name"
              required
              maxLength={80}
              defaultValue={user.name}
            />
          </div>
          <div>
            <label className="label" htmlFor="headline">
              Headline
            </label>
            <input
              className="input"
              id="headline"
              name="headline"
              maxLength={160}
              defaultValue={user.headline ?? ""}
              placeholder="Senior Product Designer at Acme Inc."
              data-testid="headline-input"
            />
          </div>
          <div>
            <label className="label" htmlFor="location">
              Location
            </label>
            <input
              className="input"
              id="location"
              name="location"
              maxLength={120}
              defaultValue={user.location ?? ""}
              placeholder="Berlin, Germany"
            />
          </div>
          <div>
            <label className="label" htmlFor="about">
              About
            </label>
            <textarea
              className="textarea"
              id="about"
              name="about"
              rows={6}
              maxLength={4000}
              defaultValue={user.about ?? ""}
              placeholder="Tell people about your experience, skills and what you’re looking for…"
              data-testid="about-input"
            />
          </div>
          <div className="flex gap-3">
            <button className="btn btn-primary" type="submit" data-testid="save-profile">
              Save changes
            </button>
            <Link href={`/profile/${user.id}`} className="btn btn-ghost">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
