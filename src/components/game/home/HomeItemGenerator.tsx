import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  getCachedHomeItemImage,
  setCachedHomeItemImage,
  getAllCachedIds,
  clearHomeItemCache,
} from '@/utils/homeItemImageCache';

async function callGenerateHomeItem(itemId: string): Promise<{ imageUrl?: string; error?: string }> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) throw new Error('Supabase not configured');

  const resp = await fetch(`${supabaseUrl}/functions/v1/generate-home-item`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({ itemId }),
  });

  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || `HTTP ${resp.status}`);
  return data;
}

const ALL_ITEMS = [
  { id: 'scrying-mirror', label: 'Scrying Mirror' },
  { id: 'simple-scrying-glass', label: 'Scrying Glass' },
  { id: 'memory-crystal', label: 'Memory Crystal' },
  { id: 'music-box', label: 'Music Box' },
  { id: 'cooking-fire', label: 'Cooking Fire' },
  { id: 'preservation-box', label: 'Preservation Box' },
  { id: 'arcane-tome', label: 'Arcane Tome' },
  { id: 'frost-chest', label: 'Frost Chest' },
  { id: 'candles', label: 'Candles' },
  { id: 'blanket', label: 'Blanket' },
  { id: 'furniture', label: 'Furniture' },
  { id: 'glow-orb', label: 'Glow Orb' },
  { id: 'warmth-stone', label: 'Warmth Stone' },
  { id: 'dagger', label: 'Dagger' },
  { id: 'sword', label: 'Sword' },
  { id: 'shield', label: 'Shield' },
];

interface HomeItemGeneratorProps {
  onClose: () => void;
}

export function HomeItemGenerator({ onClose }: HomeItemGeneratorProps) {
  const [cachedIds, setCachedIds] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [currentItem, setCurrentItem] = useState('');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [previews, setPreviews] = useState<Record<string, string>>({});

  useEffect(() => {
    refreshCacheStatus();
  }, []);

  async function refreshCacheStatus() {
    const ids = await getAllCachedIds();
    setCachedIds(ids);
    // Load previews for cached items
    const previewMap: Record<string, string> = {};
    for (const id of ids) {
      const img = await getCachedHomeItemImage(id);
      if (img) previewMap[id] = img;
    }
    setPreviews(previewMap);
  }

  async function generateAll() {
    setGenerating(true);
    setError('');
    const missing = ALL_ITEMS.filter(item => !cachedIds.includes(item.id));
    
    for (let i = 0; i < missing.length; i++) {
      const item = missing[i];
      setCurrentItem(item.label);
      setProgress(((i) / missing.length) * 100);

      try {
        const data = await callGenerateHomeItem(item.id);
        if (data?.imageUrl) {
          await setCachedHomeItemImage(item.id, data.imageUrl);
          setPreviews(prev => ({ ...prev, [item.id]: data.imageUrl }));
          setCachedIds(prev => [...prev, item.id]);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        setError(`Failed on ${item.label}: ${msg}`);
        // If rate limited, stop
        if (msg.includes('Rate limited') || msg.includes('429')) {
          break;
        }
        // Otherwise continue with next item
      }

      // Delay between requests to avoid rate limits
      if (i < missing.length - 1) {
        await new Promise(r => setTimeout(r, 3000));
      }
    }

    setProgress(100);
    setCurrentItem('');
    setGenerating(false);
    await refreshCacheStatus();
  }

  async function handleClear() {
    await clearHomeItemCache();
    setCachedIds([]);
    setPreviews({});
  }

  async function generateSingle(itemId: string, label: string) {
    setGenerating(true);
    setCurrentItem(label);
    setError('');
    try {
      const data = await callGenerateHomeItem(itemId);
      if (data?.imageUrl) {
        await setCachedHomeItemImage(itemId, data.imageUrl);
        setPreviews(prev => ({ ...prev, [itemId]: data.imageUrl }));
        setCachedIds(prev => prev.includes(itemId) ? prev : [...prev, itemId]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
    setCurrentItem('');
    setGenerating(false);
  }

  const missingCount = ALL_ITEMS.length - cachedIds.length;

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: '#1a1410' }}>
      <div
        className="shrink-0 flex items-center justify-between px-3 py-2"
        style={{
          background: 'linear-gradient(180deg, #5c4a32 0%, #3d3224 100%)',
          borderBottom: '2px solid #8b7355',
        }}
      >
        <span className="text-sm font-bold text-[#f0e8d8]">🎨 Room Item Graphics Generator</span>
        <button onClick={onClose} className="text-[#8b7355] hover:text-[#f0e8d8] text-lg">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Status */}
        <div className="text-xs text-[#8b7355] font-mono">
          Cached: {cachedIds.length}/{ALL_ITEMS.length} | Missing: {missingCount}
        </div>

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            onClick={generateAll}
            disabled={generating || missingCount === 0}
            className="bg-[#5c4a32] hover:bg-[#7a6240] text-[#f0e8d8] text-xs"
          >
            {missingCount === 0 ? '✓ All Generated' : `Generate ${missingCount} Missing`}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleClear}
            disabled={generating || cachedIds.length === 0}
            className="border-[#8b7355] text-[#8b7355] text-xs"
          >
            Clear Cache
          </Button>
        </div>

        {/* Progress */}
        {generating && (
          <div className="space-y-1">
            <div className="text-xs text-[#d4c8a0]">Generating: {currentItem}...</div>
            <Progress value={progress} className="h-2 bg-[#2d2218]" />
          </div>
        )}

        {error && (
          <div className="text-xs text-red-400 bg-red-900/30 p-2 rounded">{error}</div>
        )}

        {/* Item grid */}
        <div className="grid grid-cols-4 gap-2">
          {ALL_ITEMS.map(item => {
            const cached = previews[item.id];
            return (
              <div
                key={item.id}
                className="flex flex-col items-center gap-1 p-1 rounded"
                style={{ background: cached ? 'rgba(90,120,60,0.2)' : 'rgba(80,60,40,0.3)' }}
              >
                <div
                  className="w-12 h-12 rounded flex items-center justify-center overflow-hidden"
                  style={{ background: '#2d2218', border: '1px solid #5c4a32' }}
                >
                  {cached ? (
                    <img src={cached} alt={item.label} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[#5c4a32] text-lg">?</span>
                  )}
                </div>
                <span className="text-[0.55rem] text-[#8b7355] text-center leading-tight">{item.label}</span>
                {!cached && !generating && (
                  <button
                    onClick={() => generateSingle(item.id, item.label)}
                    className="text-[0.5rem] text-[#d4c8a0] hover:text-white"
                  >
                    gen
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
