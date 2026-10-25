import Link from "next/link";

export default function BrandLogo({
  tone = "dark",
  href = "/",
}: {
  tone?: "dark" | "light";
  href?: string;
}) {
  return (
    <Link
      href={href}
      aria-label="MimiLuxx home"
      className="inline-flex items-center gap-1.5 no-underline"
    >
      <svg className="h-8 w-8" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <path
          d="M4 18V8L9 13L14 8L19 13L24 8V18C24 21 21 24 17 24H11C7 24 4 21 4 18Z"
          fill="#EA2323"
        />
        <circle cx="9" cy="15" r="1.5" fill="#FFFFFF" />
        <circle cx="19" cy="15" r="1.5" fill="#FFFFFF" />
      </svg>
      <span
        className={`text-xl font-extrabold tracking-tight ${
          tone === "light" ? "text-white" : "text-neutral-900"
        }`}
      >
        Mimi<span className="text-[#EA2323]">Luxx</span>
      </span>
    </Link>
  );
}
