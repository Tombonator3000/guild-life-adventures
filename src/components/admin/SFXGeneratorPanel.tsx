// SFX Generator Admin Panel - Generate and preview sound effects
// This is a developer tool, not part of the main game UI

import { useState, useCallback } from 'react';
import { generateSFX, playSFXPreview, GAME_SFX_PROMPTS } from '@/services/sfxGenerator';
import { Loader2, Play, Download, Wand2, Volume2 } from 'lucide-react';
import { toast } from 'sonner';

interface GeneratedSFX {
  id: string;
  prompt: string;
  audioUrl?: string;
  audioBase64?: string;
  status: 'pending' | 'generating' | 'done' | 'error';
  error?: string;
}

export function SFXGeneratorPanel() {
  const [customPrompt, setCustomPrompt] = useState('');
  const [customDuration, setCustomDuration] = useState(1);
  const [generatedSfx, setGeneratedSfx] = useState<GeneratedSFX[]>([]);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);

  const handleGenerateSingle = useCallback(async (sfxId: string, prompt: string, duration?: number) => {
    const id = `${sfxId}-${Date.now()}`;
    
    setGeneratedSfx(prev => [...prev, { id, prompt, status: 'generating' }]);
    
    try {
      const result = await generateSFX(prompt, duration, true);
      
      if (result.success && result.audioBase64) {
        const audioUrl = `data:audio/mpeg;base64,${result.audioBase64}`;
        setGeneratedSfx(prev => 
          prev.map(s => s.id === id ? { ...s, status: 'done', audioUrl, audioBase64: result.audioBase64 } : s)
        );
        toast.success(`Generated: ${sfxId}`);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setGeneratedSfx(prev => 
        prev.map(s => s.id === id ? { ...s, status: 'error', error: message } : s)
      );
      toast.error(`Failed: ${sfxId} - ${message}`);
    }
  }, []);

  const handleGenerateAll = useCallback(async () => {
    setIsGeneratingAll(true);
    const entries = Object.entries(GAME_SFX_PROMPTS);
    
    for (const [sfxId, config] of entries) {
      await handleGenerateSingle(sfxId, config.prompt, config.duration);
      // Small delay between requests to avoid rate limiting
      await new Promise(r => setTimeout(r, 1000));
    }
    
    setIsGeneratingAll(false);
    toast.success('All SFX generated!');
  }, [handleGenerateSingle]);

  const handlePlayPreview = useCallback(async (audioUrl: string) => {
    const audio = new Audio(audioUrl);
    await audio.play();
  }, []);

  const handleDownload = useCallback((sfxId: string, audioBase64: string) => {
    const link = document.createElement('a');
    link.href = `data:audio/mpeg;base64,${audioBase64}`;
    link.download = `${sfxId}.mp3`;
    link.click();
  }, []);

  const handleQuickPreview = useCallback(async (prompt: string, duration?: number) => {
    toast.info('Generating preview...');
    try {
      await playSFXPreview(prompt, duration);
    } catch (error) {
      toast.error('Preview failed');
    }
  }, []);

  return (
    <div className="p-4 bg-background min-h-screen">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-card p-4 rounded-lg border">
          <h1 className="text-2xl font-bold mb-2">🔊 SFX Generator</h1>
          <p className="text-muted-foreground text-sm mb-4">
            Generate sound effects using ElevenLabs API. Files should be saved to <code>/public/sfx/</code>.
          </p>

          {/* Custom Prompt */}
          <div className="space-y-2 mb-4">
            <label className="text-sm font-medium">Custom Prompt</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Describe the sound effect..."
                className="flex-1 px-3 py-2 border rounded-md text-sm"
              />
              <input
                type="number"
                value={customDuration}
                onChange={(e) => setCustomDuration(parseFloat(e.target.value))}
                min={0.5}
                max={22}
                step={0.5}
                className="w-20 px-3 py-2 border rounded-md text-sm"
              />
              <button
                onClick={() => handleQuickPreview(customPrompt, customDuration)}
                disabled={!customPrompt}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm flex items-center gap-2 disabled:opacity-50"
              >
                <Play className="w-4 h-4" /> Preview
              </button>
            </div>
          </div>

          {/* Generate All Button */}
          <button
            onClick={handleGenerateAll}
            disabled={isGeneratingAll}
            className="w-full px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-md font-medium flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isGeneratingAll ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Generating All SFX...
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5" /> Generate All Game SFX ({Object.keys(GAME_SFX_PROMPTS).length} sounds)
              </>
            )}
          </button>
        </div>

        {/* Predefined SFX List */}
        <div className="bg-card p-4 rounded-lg border">
          <h2 className="text-lg font-semibold mb-3">Game Sound Effects</h2>
          <div className="grid gap-2">
            {Object.entries(GAME_SFX_PROMPTS).map(([sfxId, config]) => (
              <div key={sfxId} className="flex items-center gap-3 p-2 bg-muted/30 rounded">
                <span className="font-mono text-sm w-40">{sfxId}</span>
                <span className="flex-1 text-xs text-muted-foreground truncate">{config.prompt}</span>
                <span className="text-xs text-muted-foreground w-12">{config.duration}s</span>
                <button
                  onClick={() => handleGenerateSingle(sfxId, config.prompt, config.duration)}
                  className="p-1.5 hover:bg-accent rounded"
                  title="Generate"
                >
                  <Wand2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Generated Results */}
        {generatedSfx.length > 0 && (
          <div className="bg-card p-4 rounded-lg border">
            <h2 className="text-lg font-semibold mb-3">Generated Sounds</h2>
            <div className="space-y-2">
              {generatedSfx.map((sfx) => (
                <div key={sfx.id} className="flex items-center gap-3 p-2 bg-muted/30 rounded">
                  <span className="font-mono text-sm w-48 truncate">{sfx.id.split('-')[0]}</span>
                  
                  {sfx.status === 'generating' && (
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  )}
                  
                  {sfx.status === 'done' && sfx.audioUrl && (
                    <>
                      <button
                        onClick={() => handlePlayPreview(sfx.audioUrl!)}
                        className="p-1.5 hover:bg-accent rounded text-green-600"
                        title="Play"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDownload(sfx.id.split('-')[0], sfx.audioBase64!)}
                        className="p-1.5 hover:bg-accent rounded text-blue-600"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <span className="text-xs text-green-600">✓ Done</span>
                    </>
                  )}
                  
                  {sfx.status === 'error' && (
                    <span className="text-xs text-red-500">✗ {sfx.error}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-muted/30 p-4 rounded-lg text-sm text-muted-foreground">
          <h3 className="font-medium mb-2">Instructions</h3>
          <ol className="list-decimal list-inside space-y-1">
            <li>Click "Generate All Game SFX" to create all sound effects</li>
            <li>Preview each sound by clicking the speaker icon</li>
            <li>Download sounds you like and save to <code>/public/sfx/</code></li>
            <li>The SFXManager will automatically load them</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
