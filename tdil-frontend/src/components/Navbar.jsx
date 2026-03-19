import { NavLink } from "react-router-dom";
import Logo from './Logo';

export default function Navbar() {
  return (
    <nav className="bg-gradient-to-b from-gray-950 to-gray-900 text-white px-6 py-4 flex justify-between items-center shadow-md">
      <Logo size="lg" showText={false} className="text-white" />
      <div className="space-x-6 text-sm">
        <NavLink to="/" className="hover:text-blue-400 transition">Home</NavLink>
        <NavLink to="/directory" className="hover:text-blue-400 transition">Directory</NavLink>
        <NavLink to="/jobs" className="hover:text-blue-400 transition">Jobs</NavLink>
        <NavLink to="/rewards" className="hover:text-blue-400 transition">Rewards</NavLink>
        <NavLink to="/login" className="hover:text-blue-400 transition">Login</NavLink>
      </div>
    </nav>
  );
}
