export default function Sidebar() {
  return (
    <aside className="hidden md:flex w-64 flex-col bg-white border-r">
      <div className="p-4 font-bold text-xl text-blue-600">Divvy</div>
      <nav className="flex-1 p-4 space-y-2">
        {/* Sidebar links will go here */}
      </nav>
    </aside>
  );
}
