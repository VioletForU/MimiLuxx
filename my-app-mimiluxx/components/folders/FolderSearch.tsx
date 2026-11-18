/** A plain GET form: works without JavaScript and lands on /search. */
export default function FolderSearch({
  defaultValue = "",
  orgSlug,
  placeholder = "Search folders and files",
}: {
  defaultValue?: string;
  /** Limit the search to one organization. */
  orgSlug?: string;
  placeholder?: string;
}) {
  return (
    <form action="/search" method="get" role="search" className="flex w-full max-w-xl items-center gap-2">
      {orgSlug && <input type="hidden" name="org" value={orgSlug} />}
      <label htmlFor="folder-search" className="sr-only">
        {placeholder}
      </label>
      <input
        id="folder-search"
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder={placeholder}
        minLength={2}
        maxLength={60}
        className="h-11 w-full rounded-full border border-[#232323] bg-white px-5 text-sm text-[#111111] outline-none placeholder:text-[#767676] focus:ring-2 focus:ring-[#E5252A]/40"
      />
      <button
        type="submit"
        className="h-11 shrink-0 rounded-full bg-[#1f1f1f] px-5 text-sm font-semibold text-white transition hover:bg-black"
      >
        Search
      </button>
    </form>
  );
}
