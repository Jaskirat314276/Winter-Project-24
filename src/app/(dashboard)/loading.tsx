const DashboardLoading = () => (
  <div className="p-4 m-4 mt-0 flex flex-col gap-4 animate-pulse">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="h-28 rounded-2xl bg-ink-100" />
      <div className="h-28 rounded-2xl bg-ink-100" />
      <div className="h-28 rounded-2xl bg-ink-100" />
    </div>
    <div className="bg-white rounded-2xl border border-ink-100 p-6 flex flex-col gap-3">
      <div className="h-6 w-1/3 rounded bg-ink-100" />
      <div className="h-4 w-full rounded bg-ink-100" />
      <div className="h-4 w-full rounded bg-ink-100" />
      <div className="h-4 w-5/6 rounded bg-ink-100" />
      <div className="h-4 w-4/6 rounded bg-ink-100" />
    </div>
  </div>
);

export default DashboardLoading;
