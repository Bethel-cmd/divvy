export default function TopBar() {
  return (
    <header className="h-16 bg-white border-b flex items-center justify-between px-4 md:px-6">
      <div className="md:hidden font-bold text-xl text-blue-600">Divvy</div>
      <div className="flex items-center space-x-4">
        {/* Profile/Notifications will go here */}
      </div>
    </header>
  );
}
