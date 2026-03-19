export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-500 text-center py-6 text-sm">
      Powered by <span className="text-blue-400">TDIL</span> © {new Date().getFullYear()}
    </footer>
  );
}
