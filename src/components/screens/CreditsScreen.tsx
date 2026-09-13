// Credits Screen — rolling text with Guild Life logo background and random music

import { useEffect, useRef, useState } from 'react';
import { BookOpen, Play, Pause } from 'lucide-react';
import { GuildDialog } from '@/components/ui/GuildDialog';
import { useAudioSettings } from '@/hooks/useMusic';
import { useEnvironmentActivity } from '@/hooks/useEnvironmentActivity';
import { audioManager } from '@/audio/audioManager';

// All music tracks available in the game
const MUSIC_FILES = [
  'music/01MainTheme.mp3',
  'music/02OnTheStreet.mp3',
  'music/03guildhall.mp3',
  'music/06Bank.mp3',
  'music/09TheSlums.mp3',
  'music/10Noble-Heights.mp3',
  'music/11EnchantersWorkshop.mp3',
  'music/13rustytankard.mp3',
  'music/18OhWhatAWeekend.mp3',
  'music/19Winner.mp3',
  'music/20Cave.mp3',
  'music/Dragons_Lair.mp3',
];

const CREDITS_TEXT = [
  { type: 'title', text: 'GUILD LIFE ADVENTURES' },
  { type: 'subtitle', text: 'A Fantasy Life Simulator' },
  { type: 'spacer' },
  { type: 'heading', text: '~ Created By ~' },
  { type: 'name', text: 'Tom Husby' },
  { type: 'role', text: 'Game Designer, Producer, Creative Director' },
  { type: 'role', text: 'Chief Pixel Pusher & Master of Ceremonies' },
  { type: 'spacer' },
  { type: 'heading', text: '~ and a terrifying amount of ~' },
  { type: 'name', text: 'Claude' },
  { type: 'role', text: 'AI Code Monkey Extraordinaire' },
  { type: 'role', text: '(Anthropic\'s Finest Digital Indentured Servant)' },
  { type: 'spacer' },
  { type: 'divider' },
  { type: 'spacer' },
  { type: 'heading', text: '~ Programming ~' },
  { type: 'credit', text: 'Claude — Lead Developer, Senior Bug Manufacturer' },
  { type: 'credit', text: 'Claude — Junior Developer, Coffee-Free Edition' },
  { type: 'credit', text: 'Claude — QA Lead (marks own homework)' },
  { type: 'credit', text: 'Claude — DevOps Engineer (it works on my neural network)' },
  { type: 'credit', text: 'Tom — The one who actually tests the game' },
  { type: 'spacer' },
  { type: 'heading', text: '~ Game Design ~' },
  { type: 'credit', text: 'Tom Husby — All the good ideas' },
  { type: 'credit', text: 'Claude — All the bad ideas that seemed good at 3am' },
  { type: 'credit', text: 'Sierra On-Line — For creating Jones in the Fast Lane (1991)' },
  { type: 'credit', text: 'The ghost of Warren Davis — Original Jones designer, spiritual guide' },
  { type: 'spacer' },
  { type: 'heading', text: '~ Art Direction ~' },
  { type: 'credit', text: 'Tom — "Make it look like a medieval game"' },
  { type: 'credit', text: 'Claude — "I can\'t actually see but sure, here\'s some CSS"' },
  { type: 'credit', text: 'Tailwind CSS — For making brown look this good' },
  { type: 'credit', text: 'The letter "g" in gold-button — Real MVP' },
  { type: 'spacer' },
  { type: 'heading', text: '~ Music & Sound ~' },
  { type: 'credit', text: 'Placeholder MP3 files — Silent but golden' },
  { type: 'credit', text: 'The synth SFX system — Beep boop medieval edition' },
  { type: 'credit', text: 'AudioManager — Dual-deck crossfade engineer of the year' },
  { type: 'spacer' },
  { type: 'heading', text: '~ AI Opponents ~' },
  { type: 'credit', text: 'Grimwald — The scheming pearl menace' },
  { type: 'credit', text: 'Seraphina — The violet strategist' },
  { type: 'credit', text: 'Thornwick — The teal tactician' },
  { type: 'credit', text: 'Morgath — The rose-colored destroyer' },
  { type: 'credit', text: 'All four AI — Still can\'t beat a determined human' },
  { type: 'spacer' },
  { type: 'heading', text: '~ Notable NPCs ~' },
  { type: 'credit', text: 'Shadowfingers — Professional pocket inspector' },
  { type: 'credit', text: 'Aldric the Landlord — "Rent is due. Again."' },
  { type: 'credit', text: 'Mathilda — General Store legend, sold 10,000 loaves' },
  { type: 'credit', text: 'Morthos — Graveyard shift never felt so dead' },
  { type: 'spacer' },
  { type: 'heading', text: '~ Technical Achievements ~' },
  { type: 'credit', text: '171 tests that all pass (miraculously)' },
  { type: 'credit', text: 'WebRTC multiplayer that mostly works' },
  { type: 'credit', text: 'A Zustand store with more actions than a Marvel movie' },
  { type: 'credit', text: 'PWA support (play offline! we dare you)' },
  { type: 'credit', text: 'Mobile layout (yes, it works on your phone. barely.)' },
  { type: 'credit', text: 'Zone Editor (Ctrl+Shift+Z, the forbidden shortcut)' },
  { type: 'spacer' },
  { type: 'heading', text: '~ Bugs Squashed ~' },
  { type: 'credit', text: 'Over 100 bugs found and fixed' },
  { type: 'credit', text: 'At least 50 of them were introduced by the fixer' },
  { type: 'credit', text: 'The double resurrection exploit (RIP)' },
  { type: 'credit', text: 'AI standing perfectly still for entire games' },
  { type: 'credit', text: 'Players surviving at 0 HP through sheer willpower' },
  { type: 'credit', text: 'Noble Heights rent: 500g (sorry about that)' },
  { type: 'spacer' },
  { type: 'heading', text: '~ Special Thanks ~' },
  { type: 'credit', text: 'React — For re-rendering when we least expect it' },
  { type: 'credit', text: 'TypeScript — For telling us everything is wrong' },
  { type: 'credit', text: 'Vite — For being blazingly fast (tm)' },
  { type: 'credit', text: 'shadcn/ui — For making us look like we know what we\'re doing' },
  { type: 'credit', text: 'Lucide Icons — A sword icon for every occasion' },
  { type: 'credit', text: 'PeerJS — WebRTC for humans (and AIs pretending to be humans)' },
  { type: 'credit', text: 'GitHub Pages — Free hosting, free problems' },
  { type: 'credit', text: 'Stack Overflow — Claude\'s actual training data (sorry)' },
  { type: 'spacer' },
  { type: 'heading', text: '~ Inspirations ~' },
  { type: 'credit', text: 'Jones in the Fast Lane (Sierra On-Line, 1991)' },
  { type: 'credit', text: 'The Sims — For making life simulation a genre' },
  { type: 'credit', text: 'Dark Souls — "YOU DIED" never gets old' },
  { type: 'credit', text: 'Every fantasy RPG with a tavern named something rusty' },
  { type: 'spacer' },
  { type: 'heading', text: '~ Development Stats ~' },
  { type: 'credit', text: 'Lines of code: More than you\'d think' },
  { type: 'credit', text: 'Cups of coffee consumed: Unknown (Tom\'s side)' },
  { type: 'credit', text: 'Tokens consumed: Enough to bankrupt a small kingdom' },
  { type: 'credit', text: 'Times Claude said "Let me fix that": ∞' },
  { type: 'credit', text: 'Times it was actually fixed: ∞ - 1' },
  { type: 'spacer' },
  { type: 'heading', text: '~ Legal ~' },
  { type: 'credit', text: 'No goblins were harmed in the making of this game' },
  { type: 'credit', text: 'Shadowfingers is a fictional character and any resemblance' },
  { type: 'credit', text: 'to actual pickpockets is purely coincidental' },
  { type: 'credit', text: 'Side effects may include: compulsive rent-paying,' },
  { type: 'credit', text: 'irrational fear of Shadowfingers, and "one more turn" syndrome' },
  { type: 'spacer' },
  { type: 'divider' },
  { type: 'spacer' },
  { type: 'heading', text: '~ A Message From The Developer ~' },
  { type: 'spacer' },
  { type: 'credit', text: 'This game was built with genuine passion,' },
  { type: 'credit', text: 'questionable design decisions,' },
  { type: 'credit', text: 'and an AI that never sleeps but always dreams.' },
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
  { type: 'credit', text: 'Tom Husby & Claude' },
  { type: 'spacer' },
  { type: 'spacer' },
  { type: 'spacer' },
];

interface CreditsScreenProps {
  onClose: () => void;
}

export function CreditsScreen({ onClose }: CreditsScreenProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [scrollComplete, setScrollComplete] = useState(false);
  const [autoScroll, setAutoScroll] = useState(false);
  const { musicMuted, musicVolume } = useAudioSettings();
  const { reducedMotion, visible } = useEnvironmentActivity();

  useEffect(() => {
    audioManager.stop();
    const randomTrack = MUSIC_FILES[Math.floor(Math.random() * MUSIC_FILES.length)];
    const audio = new Audio(import.meta.env.BASE_URL + randomTrack);
    audio.loop = true;
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.src = '';
      audioRef.current = null;
      audioManager.play('main-theme');
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = musicVolume;
    audio.muted = musicMuted;
    if (musicMuted || !visible) audio.pause();
    else audio.play().catch(() => {});
  }, [musicMuted, musicVolume, visible]);

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

  const handleClose = () => { audioRef.current?.pause(); onClose(); };

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
