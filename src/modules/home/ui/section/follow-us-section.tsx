import Link from 'next/link';
import { socialIcons } from '@/lib/constants/constants';

export function FollowUsSection() {
  const socials = socialIcons.filter(
    (s) => s.name === 'Instagram' || s.name === 'YouTube'
  );
  return (
    <section className="px-4 py-10">
      <div className="mx-auto max-w-6xl rounded-lg border p-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-lg font-semibold">Follow us</h3>
            <p className="text-sm text-muted-foreground">
              새 소식을 가장 먼저 받아보세요.
            </p>
          </div>
          <div className="flex gap-3">
            {socials.map((s) => (
              <Link
                key={s.name}
                href={s.href}
                className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent"
                target="_blank"
                rel="noreferrer"
              >
                <s.icon className="h-4 w-4" /> {s.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
