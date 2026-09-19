// Credits Screen — rolling text with Guild Life logo background and random music

import { useEffect, useRef, useState } from 'react';
import { BookOpen, Play, Pause } from 'lucide-react';
import { GuildDialog } from '@/components/ui/GuildDialog';
import { useAudioSettings } from '@/hooks/useMusic';
import { useEnvironmentActivity } from '@/hooks/useEnvironmentActivity';
import { audioManager } from '@/audio/audioManager';
import { MUSIC_TRACKS } from '@/audio/musicConfig';

// Use the same gain-controlled music path as the rest of the game.
const CREDIT_TRACKS = Object.keys(MUSIC_TRACKS);

const CREDITS_TEXT = [
  { type: 'title', text: 'GUILD LIFE ADVENTURES' },
  { type: 'subtitle', text: 'A Fantasy Life Simulator' },
  { type: 'spacer' },
  { type: 'heading', text: '~ Created By ~' },
  { type: 'name', text: 'Tom Husby' },
  { type: 'role', text: 'Game Designer, Producer, Creative Director' },
  { type: 'role', text: 'Chief Pixel Pusher & Master of Ceremonies' },
  { type: 'spacer' },
  { type: 'heading', text: '~ Programming ~' },
  { type: 'credit', text: 'Built one stubborn system at a time' },
  { type: 'credit', text: 'Tested by adventurers with excellent timing and terrible luck' },
  { type: 'credit', text: 'Bugs supplied free of charge, fixes sold separately' },
  { type: 'credit', text: 'Tom Husby - The one who actually tests the game' },
  { type: 'spacer' },
  { type: 'heading', text: '~ Game Design ~' },
  { type: 'credit', text: 'Tom Husby - All the good ideas' },
  { type: 'credit', text: 'Late nights - All the bad ideas that seemed good at 3am' },
  { type: 'credit', text: 'Sierra On-Line - For creating Jones in the Fast Lane (1991)' },
  { type: 'credit', text: 'The ghost of Warren Davis - Original Jones designer, spiritual guide' },
  { type: 'spacer' },
  { type: 'heading', text: '~ Art Direction ~' },
  { type: 'credit', text: 'Tom - "Make it look like a medieval game"' },
  { type: 'credit', text: 'Guildholm - "More parchment. More brass. Less restraint."' },
  { type: 'credit', text: 'The letter "g" in gold-button - Real MVP' },
  { type: 'spacer' },
  { type: 'heading', text: '~ Music & Sound ~' },
  { type: 'credit', text: 'The town orchestra - Frequently late, occasionally in tune' },
  { type: 'credit', text: 'The forge - Percussion section, unpaid' },
  { type: 'credit', text: 'The tavern patrons - Volume control not included' },
  { type: 'spacer' },
  { type: 'heading', text: '~ Rival Adventurers ~' },
  { type: 'credit', text: 'Grimwald - The scheming pearl menace' },
  { type: 'credit', text: 'Seraphina - The violet strategist' },
  { type: 'credit', text: 'Thornwick - The teal tactician' },
  { type: 'credit', text: 'Morgath - The rose-colored destroyer' },
  { type: 'credit', text: 'All four rivals - Still cannot beat a determined human' },
  { type: 'spacer' },
  { type: 'heading', text: '~ Notable Citizens ~' },
  { type: 'credit', text: 'Shadowfingers - Professional pocket inspector' },
  { type: 'credit', text: 'Aldric the Landlord - "Rent is due. Again."' },
  { type: 'credit', text: 'Mathilda - General Store legend, sold 10,000 loaves' },
  { type: 'credit', text: 'Morthos - Graveyard shift never felt so dead' },
  { type: 'spacer' },
  { type: 'heading', text: '~ Guild Achievements ~' },
  { type: 'credit', text: 'Thousands of rules checked, argued with, and checked again' },
  { type: 'credit', text: 'Online adventures across the realm' },
  { type: 'credit', text: 'Offline play for hermits, cave dwellers, and commuters' },
  { type: 'credit', text: 'A mobile layout that survives surprisingly small tavern tables' },
  { type: 'spacer' },
  { type: 'heading', text: '~ Bugs Squashed ~' },
  { type: 'credit', text: 'Over 100 bugs found and fixed' },
  { type: 'credit', text: 'At least 50 were introduced by the fixer' },
  { type: 'credit', text: 'The double resurrection exploit (RIP)' },
  { type: 'credit', text: 'Rivals standing perfectly still for entire games' },
  { type: 'credit', text: 'Players surviving at 0 HP through sheer willpower' },
  { type: 'credit', text: 'Noble Heights rent: 500g (sorry about that)' },
  { type: 'spacer' },
  { type: 'heading', text: '~ Inspirations ~' },
  { type: 'credit', text: 'Jones in the Fast Lane (Sierra On-Line, 1991)' },
  { type: 'credit', text: 'The Sims - For making life simulation a genre' },
  { type: 'credit', text: 'Dark Souls - "YOU DIED" never gets old' },
  { type: 'credit', text: 'Every fantasy RPG with a tavern named something rusty' },
  { type: 'spacer' },
  { type: 'heading', text: '~ Development Stats ~' },
  { type: 'credit', text: 'Lines of code: More than you would think' },
  { type: 'credit', text: 'Cups of coffee consumed: Classified by the Crown' },
  { type: 'credit', text: 'Gold lost during testing: Enough to bankrupt a small kingdom' },
  { type: 'credit', text: 'Times someone said "Let me fix that": Too many' },
  { type: 'credit', text: 'Times it stayed fixed: Ask again next week' },
  { type: 'spacer' },
  { type: 'heading', text: '~ Legal ~' },
  { type: 'credit', text: 'No goblins were harmed in the making of this game' },
  { type: 'credit', text: 'Shadowfingers is fictional; your missing purse is a separate matter' },
  { type: 'credit', text: 'Side effects may include compulsive rent-paying,' },
  { type: 'credit', text: 'irrational fear of alleys, and "one more turn" syndrome' },
  { type: 'spacer' },
  { type: 'divider' },
  { type: 'spacer' },
  { type: 'heading', text: '~ A Message From The Developer ~' },
  { type: 'spacer' },
  { type: 'credit', text: 'This game was built with genuine passion,' },
  { type: 'credit', text: 'questionable design decisions,' },
  { type: 'credit', text: 'and enough stubbornness to outlast the Landlord.' },
  { type: 'spacer' },
  { type: 'credit', text: 'Thank you for playing Guild Life Adventures.' },
  { type: 'credit', text: 'May your gold be plentiful,' },
  { type: 'credit', text: 'your happiness ever-growing,' },
  { type: 'credit', text: 'and Shadowfingers forever far away.' },
  { type: 'spacer' },
  { type: 'spacer' },
  { type: 'title', text: 'GUILD LIFE ADVENTURES' },
  { type: 'subtitle', text: '2025 - 2026' },
  { type: 'spacer' },
  { type: 'credit', text: 'Tom Husby' },
  { type: 'spacer' },
  { type: 'spacer' },
  { type: 'spacer' },
];

interface CreditsScreenProps {
  onClose: () => void;
}

export function CreditsScreen({ onClose }: CreditsScreenProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [creditsTrack] = useState(() => CREDIT_TRACKS[Math.floor(Math.random() * CREDIT_TRACKS.length)]);
  const [scrollComplete, setScrollComplete] = useState(false);
  const [autoScroll, setAutoScroll] = useState(false);
  const { musicMuted } = useAudioSettings();
  const { reducedMotion, visible } = useEnvironmentActivity();

  useEffect(() => {
    const previousTrack = audioManager.getCurrentTrack();
    return () => {
      if (previousTrack) audioManager.play(previousTrack);
      else audioManager.stop();
    };
  }, []);

  useEffect(() => {
    if (musicMuted || !visible) audioManager.stop();
    else audioManager.play(creditsTrack);
  }, [creditsTrack, musicMuted, visible]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !autoScroll || reducedMotion || !visible) return;
    let lastTime = performance.now();
    let animId: number;
    const scroll = (time: number) => {
      el.scrollTop += Math.min(time - lastTime, 50) / 1000 * 40;
      lastTime = time;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10) {
        setScrollComplete(true);
        setAutoScroll(false);
        return;
      }
      animId = requestAnimationFrame(scroll);
    };
    animId = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(animId);
  }, [autoScroll, reducedMotion, visible]);

  const handleClose = onClose;

  return (
    <GuildDialog title="About Guild Life" onClose={handleClose} closeLabel="Close credits" icon={<BookOpen />}
      className="guild-credits" bodyRef={scrollRef}
      description="The people, questionable choices and inspiration behind Guildholm."
      footer={<div className="guild-dialog-footer-row">
        <button disabled={reducedMotion} aria-pressed={autoScroll} className="guild-button" onClick={() => {
          if (scrollComplete) { scrollRef.current?.scrollTo({top:0}); setScrollComplete(false); }
          setAutoScroll(value => !value);
        }}>{autoScroll ? <Pause /> : <Play />}{autoScroll ? 'Pause credits' : 'Roll credits'}</button>
        <button className="guild-button guild-button--gold" onClick={handleClose}>Done</button>
      </div>}>
        {/* Credit lines */}
        <div className="flex flex-col items-center px-2 py-4">
          {CREDITS_TEXT.map((line, i) => {
            switch (line.type) {
              case 'title':
                return (
                  <h1 key={i} className="font-display text-4xl md:text-5xl font-bold text-amber-300 mb-2 tracking-wider text-center">
                    {line.text}
                  </h1>
                );
              case 'subtitle':
                return (
                  <p key={i} className="font-display text-xl md:text-2xl text-amber-200/80 mb-6 tracking-widest text-center">
                    {line.text}
                  </p>
                );
              case 'heading':
                return (
                  <h2 key={i} className="font-display text-xl text-amber-400 mt-2 mb-3 text-center">
                    {line.text}
                  </h2>
                );
              case 'name':
                return (
                  <p key={i} className="font-display text-2xl md:text-3xl text-white font-bold mb-1 text-center">
                    {line.text}
                  </p>
                );
              case 'role':
                return (
                  <p key={i} className="font-display text-base text-amber-200/70 mb-1 text-center italic">
                    {line.text}
                  </p>
                );
              case 'credit':
                return (
                  <p key={i} className="text-base text-white/85 mb-1.5 text-center leading-relaxed">
                    {line.text}
                  </p>
                );
              case 'divider':
                return (
                  <div key={i} className="w-48 h-px bg-amber-400/40 my-4" />
                );
              case 'spacer':
                return <div key={i} className="h-8" />;
              default:
                return null;
            }
          })}
        </div>
    </GuildDialog>
  );
}
