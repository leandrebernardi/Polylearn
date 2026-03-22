import React from 'react';
import { motion } from 'motion/react';
import { Trophy, Shield, Flame, User as UserIcon, Bot } from 'lucide-react';
import { cn } from '../lib/utils';

export type League = 'Bronze' | 'Silver' | 'Gold' | 'Sapphire' | 'Ruby' | 'Emerald' | 'Amethyst' | 'Pearl' | 'Obsidian' | 'Diamond';

interface Participant {
  uid: string;
  displayName: string;
  photoURL?: string;
  leaguePoints: number;
  isBot?: boolean;
}

interface LeagueBoardProps {
  currentLeague: League;
  participants: Participant[];
  currentUserUid?: string;
}

const LEAGUE_COLORS: Record<League, string> = {
  Bronze: 'text-amber-700 bg-amber-50 border-amber-200',
  Silver: 'text-slate-400 bg-slate-50 border-slate-200',
  Gold: 'text-yellow-500 bg-yellow-50 border-yellow-200',
  Sapphire: 'text-blue-500 bg-blue-50 border-blue-200',
  Ruby: 'text-red-500 bg-red-50 border-red-200',
  Emerald: 'text-emerald-500 bg-emerald-50 border-emerald-200',
  Amethyst: 'text-purple-500 bg-purple-50 border-purple-200',
  Pearl: 'text-pink-400 bg-pink-50 border-pink-200',
  Obsidian: 'text-slate-900 bg-slate-100 border-slate-300',
  Diamond: 'text-cyan-400 bg-cyan-50 border-cyan-200',
};

export const LeagueBoard: React.FC<LeagueBoardProps> = ({ currentLeague, participants, currentUserUid }) => {
  // Sort participants by points
  const sortedParticipants = [...participants].sort((a, b) => b.leaguePoints - a.leaguePoints);

  return (
    <div className="bg-white rounded-3xl border-2 border-slate-200 shadow-sm overflow-hidden">
      <div className={cn("p-6 border-b-2 flex items-center justify-between", LEAGUE_COLORS[currentLeague])}>
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8" />
          <div>
            <h3 className="text-xl font-black uppercase tracking-tight">{currentLeague} League</h3>
            <p className="text-xs opacity-70 font-bold">Top 10 advance to next league</p>
          </div>
        </div>
        <Trophy className="w-6 h-6 opacity-50" />
      </div>

      <div className="divide-y divide-slate-100">
        {sortedParticipants.map((p, idx) => {
          const isCurrentUser = p.uid === currentUserUid;
          const isTop3 = idx < 3;
          const isPromotionZone = idx < 10;
          const isDemotionZone = idx > 25;

          return (
            <motion.div
              key={p.uid}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={cn(
                "flex items-center gap-4 p-4 transition-colors",
                isCurrentUser ? "bg-indigo-50" : "hover:bg-slate-50"
              )}
            >
              <div className={cn(
                "w-8 text-center font-black text-lg",
                isTop3 ? "text-yellow-500" : "text-slate-400"
              )}>
                {idx + 1}
              </div>

              <div className="relative">
                {p.photoURL ? (
                  <img src={p.photoURL} alt={p.displayName} className="w-10 h-10 rounded-full border-2 border-white shadow-sm" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center border-2 border-white shadow-sm">
                    {p.isBot ? <Bot className="w-6 h-6 text-slate-400" /> : <UserIcon className="w-6 h-6 text-slate-400" />}
                  </div>
                )}
                {isCurrentUser && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white" />
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={cn("font-bold text-slate-700", isCurrentUser && "text-indigo-600")}>
                    {p.displayName}
                  </span>
                  {p.isBot && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase">Bot</span>}
                </div>
                {isPromotionZone && idx < 3 && <span className="text-[10px] text-emerald-600 font-bold uppercase">Promotion Zone</span>}
              </div>

              <div className="flex items-center gap-1.5 font-black text-slate-600">
                <span>{p.leaguePoints}</span>
                <span className="text-xs text-slate-400">XP</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="p-4 bg-slate-50 text-center">
        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Ends in 3 days 14 hours</p>
      </div>
    </div>
  );
};
