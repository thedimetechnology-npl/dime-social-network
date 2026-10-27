import Link from "next/link";
import { Avatar } from "./Avatar";

export function Stories({
  people,
}: {
  people: { id: string; name: string; avatar_key: string | null }[];
}) {
  return (
    <section className="card" aria-label="Recent stories" data-testid="stories">
      <div className="sc-card-head" style={{ padding: "0.9rem 1rem 0" }}>
        <h2 className="sc-card-title">Recent stories</h2>
        <Link href="/mynetwork" className="sc-see-all">
          See all
        </Link>
      </div>

      <div className="sc-stories">
        <div className="sc-story">
          <Link href="/profile/edit" aria-label="Add your story">
            <span className="sc-story-circle" style={{ background: "#dbeafe" }}>
              <span className="sc-story-add">+</span>
            </span>
          </Link>
          <span className="sc-story-name">Add story</span>
        </div>

        {people.map((p) => (
          <div key={p.id} className="sc-story">
            <Link href={`/profile/${p.id}`} aria-label={`${p.name}'s profile`}>
              <span className="sc-story-circle">
                <span>
                  <Avatar name={p.name} srcKey={p.avatar_key} size={52} />
                </span>
              </span>
            </Link>
            <span className="sc-story-name">{p.name.split(" ")[0]}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
