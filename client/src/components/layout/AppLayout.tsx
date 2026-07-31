import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import BottomNav from './BottomNav';
import { Footer } from './Footer';
import { AgeGateModal } from '../ui/AgeGateModal';
import { ParticleBackground } from '../ui/ParticleBackground';

export default function AppLayout() {
  return (
    <div className="w-full min-h-screen bg-[#0A0E1A] text-white flex flex-col relative overflow-x-hidden">
      {/* Particle Canvas Background */}
      <ParticleBackground />

      {/* Age & Compliance Modal */}
      <AgeGateModal />

      {/* Top Website Header */}
      <Navbar />

      {/* Main Website Container */}
      <main className="flex-1 w-full pt-24 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <Outlet />
      </main>

      {/* Footer */}
      <Footer />

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden relative z-50">
        <BottomNav />
      </div>
    </div>
  );
}

