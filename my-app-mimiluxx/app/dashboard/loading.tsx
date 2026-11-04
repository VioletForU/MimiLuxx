export default function DashboardLoading() {
  const bar = "animate-pulse rounded-xl bg-[#ECECEF]";
  return (
    <div className="min-h-screen bg-[#EEF0F4] px-3 py-4 sm:px-6 sm:py-6" role="status" aria-label="Loading dashboard">
      <div className="mx-auto w-full max-w-[1440px] rounded-[28px] bg-white px-5 pb-12 pt-6 shadow-[0_25px_60px_rgba(16,16,28,0.10)] sm:px-8 lg:px-12">
        <div className="flex items-center gap-6 border-b border-[#F0F0F2] pb-5">
          <div className={`${bar} h-9 w-36`} />
          <div className={`${bar} ml-auto hidden h-11 w-[420px] rounded-full lg:block`} />
          <div className={`${bar} ml-auto h-10 w-28 rounded-full lg:ml-0`} />
        </div>
        <div className={`${bar} mt-8 h-9 w-72`} />
        <div className="mt-8 flex flex-col gap-6 lg:flex-row lg:gap-10">
          <div className={`${bar} h-16 w-full lg:h-[420px] lg:w-[240px] lg:shrink-0 rounded-[28px]`} />
          <div className="flex-1">
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className={`${bar} h-[108px] rounded-2xl`} />
              ))}
            </div>
            <div className={`${bar} mt-10 h-7 w-40`} />
            <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className={`${bar} h-[132px] rounded-[18px]`} />
              ))}
            </div>
            <div className={`${bar} mt-10 h-64 rounded-2xl`} />
          </div>
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
