import { Sliders, Shield, Zap, TrendingUp, DollarSign, Award, Gift, Lock } from 'lucide-react';
import { useGameControl, type RigMode } from '../../store/GameControlContext';
import { useToast } from '../../components/ui/Toast';
import { formatCurrency } from '../../lib/utils';

export default function AdminGamesPage() {
  const { settings, updateSettings, updateGameSetting, applyPreset, houseNetReserve } = useGameControl();
  const { addToast } = useToast();

  const handleGlobalRtpChange = (val: number) => {
    updateSettings({ globalRtp: val });
  };

  const handleRigModeChange = (mode: RigMode) => {
    applyPreset(mode);
    addToast({
      type: 'success',
      title: `Applied ${mode.toUpperCase().replace('_', ' ')} Preset`,
      message: `Platform RTP and game probabilities adjusted immediately.`,
    });
  };

  const toggleFirstBetGuarantee = () => {
    const nextVal = !settings.firstBetWinGuarantee;
    updateSettings({ firstBetWinGuarantee: nextVal });
    addToast({
      type: nextVal ? 'success' : 'warning',
      title: nextVal ? '🎉 First-Bet Win Guarantee ENABLED' : '⚠️ First-Bet Win Guarantee DISABLED',
      message: nextVal ? 'New players are guaranteed to win their very first bet.' : 'New players subject to standard RNG.',
    });
  };

  const toggleZeroLossShield = () => {
    const nextVal = !settings.zeroLossShield;
    updateSettings({ zeroLossShield: nextVal });
    addToast({
      type: nextVal ? 'success' : 'warning',
      title: nextVal ? '🛡️ Zero-Loss Protection Shield ENABLED' : '⚠️ Zero-Loss Protection Shield DISABLED',
      message: nextVal ? 'House net profit will never drop below reserve thresholds.' : 'Standard house risk enabled.',
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(212,175,55,0.15)] pb-5">
        <div>
          <h1 className="text-2xl font-black text-[#E8C97A] font-heading flex items-center gap-2.5">
            <Sliders className="w-6 h-6 text-gold" />
            Game Control & Win-Loss Engine
          </h1>
          <p className="text-xs text-[rgba(212,175,55,0.5)] mt-1">
            Configure real-time Return-To-Player (RTP) %, first-bet win guarantees, house loss safeguards, and crash caps.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs font-mono font-bold text-emerald-400 block">{formatCurrency(houseNetReserve)}</span>
            <span className="text-[10px] text-[rgba(212,175,55,0.4)]">House Net Reserve</span>
          </div>
          <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-amber-500/10 text-gold border border-amber-500/30 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-gold" />
            Live Control Engine Active
          </span>
        </div>
      </div>

      {/* Smart Risk & Welcome Protections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Protection 1: First-Bet Win Guarantee */}
        <div
          onClick={toggleFirstBetGuarantee}
          className={`cursor-pointer p-5 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
            settings.firstBetWinGuarantee
              ? 'bg-[rgba(46,204,113,0.12)] border-[#2ECC71] shadow-[0_0_20px_rgba(46,204,113,0.15)]'
              : 'royal-panel border-[rgba(212,175,55,0.15)] opacity-70'
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-[#2ECC71]" />
              <h3 className="text-sm font-black text-[#E8C97A]">🎉 New Player First-Bet Win Guarantee</h3>
            </div>
            <p className="text-xs text-[rgba(212,175,55,0.6)]">
              Guarantees that a brand new player **NEVER loses their first bet** on any game to maximize onboarding retention.
            </p>
          </div>

          <div className={`w-12 h-6 rounded-full p-1 transition-colors flex items-center shrink-0 ${
            settings.firstBetWinGuarantee ? 'bg-[#2ECC71] justify-end' : 'bg-gray-700 justify-start'
          }`}>
            <div className="w-4 h-4 rounded-full bg-white shadow-md" />
          </div>
        </div>

        {/* Protection 2: Zero-Loss Protection Shield */}
        <div
          onClick={toggleZeroLossShield}
          className={`cursor-pointer p-5 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
            settings.zeroLossShield
              ? 'bg-[rgba(212,175,55,0.12)] border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.15)]'
              : 'royal-panel border-[rgba(212,175,55,0.15)] opacity-70'
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-gold" />
              <h3 className="text-sm font-black text-[#E8C97A]">🛡️ Admin Zero-Loss Protection Shield</h3>
            </div>
            <p className="text-xs text-[rgba(212,175,55,0.6)]">
              Automatically clamps risk so overall platform House Net Reserve **never drops below 0** (Admin never in loss).
            </p>
          </div>

          <div className={`w-12 h-6 rounded-full p-1 transition-colors flex items-center shrink-0 ${
            settings.zeroLossShield ? 'bg-[#D4AF37] justify-end' : 'bg-gray-700 justify-start'
          }`}>
            <div className="w-4 h-4 rounded-full bg-white shadow-md" />
          </div>
        </div>
      </div>

      {/* Quick Preset Selector Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Preset 1: Fair */}
        <button
          onClick={() => handleRigModeChange('fair')}
          className={`text-left p-5 rounded-2xl border transition-all ${
            settings.rigMode === 'fair'
              ? 'bg-[rgba(46,204,113,0.12)] border-[#2ECC71] shadow-[0_0_20px_rgba(46,204,113,0.2)]'
              : 'royal-panel border-[rgba(212,175,55,0.15)] hover:border-[rgba(212,175,55,0.3)]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-black text-[#2ECC71] flex items-center gap-2">
              <Award className="w-4 h-4" />
              ⚖️ Standard Fair Mode
            </span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-[#2ECC71]">
              95% RTP
            </span>
          </div>
          <p className="text-[11px] text-[rgba(212,175,55,0.6)] mt-2">
            Balanced casino house edge (~5%). Standard mathematical probabilities with natural payouts.
          </p>
        </button>

        {/* Preset 2: House Profit */}
        <button
          onClick={() => handleRigModeChange('house_profit')}
          className={`text-left p-5 rounded-2xl border transition-all ${
            settings.rigMode === 'house_profit'
              ? 'bg-[rgba(231,76,60,0.15)] border-[#E74C3C] shadow-[0_0_20px_rgba(231,76,60,0.2)]'
              : 'royal-panel border-[rgba(212,175,55,0.15)] hover:border-[rgba(212,175,55,0.3)]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-black text-[#E74C3C] flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              💰 Max House Profit Mode
            </span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-rose-500/20 text-[#E74C3C]">
              75% RTP
            </span>
          </div>
          <p className="text-[11px] text-[rgba(212,175,55,0.6)] mt-2">
            Increases house margin to ~25%. High early crash rates, mine explosion frequency, and dealer hand boost.
          </p>
        </button>

        {/* Preset 3: Player Festival Boost */}
        <button
          onClick={() => handleRigModeChange('player_boost')}
          className={`text-left p-5 rounded-2xl border transition-all ${
            settings.rigMode === 'player_boost'
              ? 'bg-[rgba(241,196,15,0.15)] border-[#F1C40F] shadow-[0_0_20px_rgba(241,196,15,0.2)]'
              : 'royal-panel border-[rgba(212,175,55,0.15)] hover:border-[rgba(212,175,55,0.3)]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-black text-[#F1C40F] flex items-center gap-2">
              <Zap className="w-4 h-4" />
              🚀 Player Festival Boost
            </span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-[#F1C40F]">
              98% RTP
            </span>
          </div>
          <p className="text-[11px] text-[rgba(212,175,55,0.6)] mt-2">
            High payout frequency for marketing & events. Reduced crash risk and boosted player luck.
          </p>
        </button>
      </div>

      {/* Global RTP Slider Panel */}
      <div className="royal-panel rounded-2xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[rgba(212,175,55,0.1)] pb-4">
          <div>
            <h2 className="text-base font-black text-[#E8C97A] flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-gold" />
              Global Platform RTP Slider
            </h2>
            <p className="text-xs text-[rgba(212,175,55,0.5)]">
              Directly scales the win-loss algorithm across all 8 platform games in real time.
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black font-mono text-gold">{settings.globalRtp}%</span>
            <span className="block text-[10px] text-[rgba(212,175,55,0.4)]">Target Return to Player</span>
          </div>
        </div>

        <div className="space-y-3">
          <input
            type="range"
            min="50"
            max="99"
            step="1"
            value={settings.globalRtp}
            onChange={e => handleGlobalRtpChange(parseInt(e.target.value))}
            className="w-full h-3 bg-[#061510] rounded-lg appearance-none cursor-pointer accent-[#D4AF37]"
          />
          <div className="flex justify-between text-[11px] text-[rgba(212,175,55,0.4)] font-mono">
            <span>50% (Tight House Edge)</span>
            <span>75% (Profit Mode)</span>
            <span>92% (Standard)</span>
            <span>99% (High Payout)</span>
          </div>
        </div>
      </div>

      {/* Per-Game Tuning Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Aviator Controls */}
        <div className="royal-panel rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[rgba(212,175,55,0.1)] pb-3">
            <h3 className="text-sm font-black text-[#E8C97A] flex items-center gap-2">
              ✈️ Aviator Crash Settings
            </h3>
            <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Active</span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between text-[11px] text-[rgba(212,175,55,0.7)] mb-1">
                <span>Max Crash Cap Multiplier</span>
                <span className="font-mono text-gold font-bold">{settings.aviator.maxCrash}×</span>
              </div>
              <input
                type="range"
                min="2"
                max="200"
                step="1"
                value={settings.aviator.maxCrash}
                onChange={e => updateGameSetting('aviator', { maxCrash: parseInt(e.target.value) })}
                className="w-full h-2 bg-[#061510] rounded appearance-none cursor-pointer accent-[#D4AF37]"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-[rgba(212,175,55,0.7)] mb-1">
                <span>Instant Crash Rate (1.00x)</span>
                <span className="font-mono text-rose-400 font-bold">{settings.aviator.instantCrashRate}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="25"
                step="1"
                value={settings.aviator.instantCrashRate}
                onChange={e => updateGameSetting('aviator', { instantCrashRate: parseInt(e.target.value) })}
                className="w-full h-2 bg-[#061510] rounded appearance-none cursor-pointer accent-[#E74C3C]"
              />
            </div>
          </div>
        </div>

        {/* Mines Controls */}
        <div className="royal-panel rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[rgba(212,175,55,0.1)] pb-3">
            <h3 className="text-sm font-black text-[#E8C97A] flex items-center gap-2">
              💣 Mines Bomb Explosion Bias
            </h3>
            <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Active</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between text-[11px] text-[rgba(212,175,55,0.7)] mb-1">
              <span>Bomb Hit Odds Modifier</span>
              <span className={`font-mono font-bold ${settings.mines.bombBias > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {settings.mines.bombBias > 0 ? `+${settings.mines.bombBias}% (Harder)` : `${settings.mines.bombBias}% (Easier)`}
              </span>
            </div>
            <input
              type="range"
              min="-30"
              max="30"
              step="5"
              value={settings.mines.bombBias}
              onChange={e => updateGameSetting('mines', { bombBias: parseInt(e.target.value) })}
              className="w-full h-2 bg-[#061510] rounded appearance-none cursor-pointer accent-[#D4AF37]"
            />
            <p className="text-[10px] text-[rgba(212,175,55,0.4)]">
              Positive values increase the chance of hitting a bomb early; negative values boost safe tile reveals.
            </p>
          </div>
        </div>

        {/* Teen Patti Controls */}
        <div className="royal-panel rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[rgba(212,175,55,0.1)] pb-3">
            <h3 className="text-sm font-black text-[#E8C97A] flex items-center gap-2">
              🃏 Teen Patti Dealer Win Boost
            </h3>
            <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Active</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between text-[11px] text-[rgba(212,175,55,0.7)] mb-1">
              <span>Dealer Win Advantage Boost</span>
              <span className="font-mono text-gold font-bold">+{settings.teenPatti.houseWinBoost}%</span>
            </div>
            <input
              type="range"
              min="-20"
              max="50"
              step="5"
              value={settings.teenPatti.houseWinBoost}
              onChange={e => updateGameSetting('teenPatti', { houseWinBoost: parseInt(e.target.value) })}
              className="w-full h-2 bg-[#061510] rounded appearance-none cursor-pointer accent-[#D4AF37]"
            />
          </div>
        </div>

        {/* Ocean Hunter Controls */}
        <div className="royal-panel rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[rgba(212,175,55,0.1)] pb-3">
            <h3 className="text-sm font-black text-[#E8C97A] flex items-center gap-2">
              🌊 Ocean Hunter Fish Catch Rate
            </h3>
            <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Active</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between text-[11px] text-[rgba(212,175,55,0.7)] mb-1">
              <span>Catch Ease Multiplier</span>
              <span className="font-mono text-gold font-bold">{settings.oceanHunter.catchRate}×</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={settings.oceanHunter.catchRate}
              onChange={e => updateGameSetting('oceanHunter', { catchRate: parseFloat(e.target.value) })}
              className="w-full h-2 bg-[#061510] rounded appearance-none cursor-pointer accent-[#D4AF37]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
