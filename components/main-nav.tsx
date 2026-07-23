import Link from "next/link";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/import", label: "Import CSV" },
  { href: "/settings", label: "Settings" },
];

export function MainNav() {
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
        <span className="font-semibold">Payment Chaser</span>
        <nav className="flex gap-4 text-sm text-muted-foreground">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
