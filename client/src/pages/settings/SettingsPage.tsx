import { motion } from 'framer-motion';
import { Settings as SettingsIcon, Moon, Globe, Volume2, Eye, Shield } from 'lucide-react';

export default function SettingsPage() {
  const settings = [
    { icon: <Moon className="w-5 h-5 text-violet-light" />, label: 'Dark Mode', desc: 'App always uses dark theme', enabled: true },
    { icon: <Globe className="w-5 h-5 text-neon-green" />, label: 'Language', desc: 'English', enabled: false, isSelect: true },
    { icon: <Volume2 className="w-5 h-5 text-gold" />, label: 'Sound Effects', desc: 'Game sounds and notifications', enabled: true },
    { icon: <Eye className="w-5 h-5 text-neon-red" />, label: 'Show Balance', desc: 'Display balance on home screen', enabled: true },
    { icon: <Shield className="w-5 h-5 text-violet-light" />, label: 'Biometric Login', desc: 'Use Face ID / Fingerprint', enabled: false },
  ];

  return (
    <div className="px-4 py-4 space-y-4">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-bold text-white font-heading flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-violet-light" /> Settings
        </h1>
      </motion.div>

      <div className="space-y-2">
        {settings.map((setting, i) => (
          <motion.div
            key={setting.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-3 bg-surface border border-border rounded-[var(--radius-lg)] p-4"
          >
            <div className="w-10 h-10 rounded-xl bg-surface-light flex items-center justify-center flex-shrink-0">
              {setting.icon}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">{setting.label}</p>
              <p className="text-xs text-navy-500">{setting.desc}</p>
            </div>
            {setting.isSelect ? (
              <span className="text-xs text-violet-light font-medium cursor-pointer">Change</span>
            ) : (
              <div className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors ${setting.enabled ? 'bg-violet' : 'bg-navy-700'}`}>
                <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all ${setting.enabled ? 'right-0.5' : 'left-0.5'}`} />
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* App Info */}
      <div className="text-center pt-6 pb-4">
        <p className="text-xs text-navy-600">PlayArena v1.0.0</p>
        <p className="text-[10px] text-navy-700 mt-1">Demo mode • No real money involved</p>
      </div>
    </div>
  );
}
