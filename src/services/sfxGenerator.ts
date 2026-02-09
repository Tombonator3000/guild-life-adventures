// SFX Generation Service - calls the ElevenLabs edge function
import JSZip from 'jszip';

export interface SFXGenerationResult {
  success: boolean;
  audioUrl?: string;
  audioBase64?: string;
  error?: string;
}

/**
 * Generate a sound effect using ElevenLabs API
 * @param prompt - Description of the sound effect to generate
 * @param duration - Optional duration in seconds (0.5-22)
 * @param returnBase64 - If true, returns base64 for saving; if false, returns playable URL
 */
export async function generateSFX(
  prompt: string,
  duration?: number,
  returnBase64 = false
): Promise<SFXGenerationResult> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase environment variables not configured');
    }

    const response = await fetch(
      `${supabaseUrl}/functions/v1/elevenlabs-sfx`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ prompt, duration, returnBase64 }),
      }
    );

    // Check content-type BEFORE parsing
    const contentType = response.headers.get('content-type');
    
    if (!response.ok) {
      // Try to get error details
      if (contentType?.includes('application/json')) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Request failed: ${response.status}`);
      } else {
        const text = await response.text();
        console.error('API returned non-JSON error:', text.substring(0, 200));
        throw new Error(`API error ${response.status}: ${response.statusText}`);
      }
    }

    if (returnBase64) {
      if (!contentType?.includes('application/json')) {
        const text = await response.text();
        console.error('Expected JSON but got:', contentType, text.substring(0, 200));
        throw new Error('Expected JSON response for base64 audio');
      }
      const data = await response.json();
      return { success: true, audioBase64: data.audioBase64 };
    }

    // For playback, expect audio/mpeg
    if (!contentType?.includes('audio')) {
      const text = await response.text();
      console.error('Expected audio but got:', contentType, text.substring(0, 200));
      throw new Error('Expected audio response');
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    return { success: true, audioUrl };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('SFX generation failed:', message);
    return { success: false, error: message };
  }
}

/**
 * Play a generated sound effect
 */
export async function playSFXPreview(prompt: string, duration?: number): Promise<void> {
  const result = await generateSFX(prompt, duration, false);
  if (result.success && result.audioUrl) {
    const audio = new Audio(result.audioUrl);
    await audio.play();
  } else {
    throw new Error(result.error || 'Failed to generate SFX');
  }
}

/**
 * Generate all SFX and download as ZIP
 */
export async function generateAllSFXAsZip(
  onProgress?: (current: number, total: number, sfxId: string, success: boolean) => void
): Promise<Blob> {
  const zip = new JSZip();
  const entries = Object.entries(GAME_SFX_PROMPTS);
  let successCount = 0;

  for (let i = 0; i < entries.length; i++) {
    const [sfxId, config] = entries[i];
    
    try {
      const result = await generateSFX(config.prompt, config.duration, true);
      
      if (result.success && result.audioBase64) {
        // Convert base64 to binary and add to zip
        const binaryData = Uint8Array.from(atob(result.audioBase64), c => c.charCodeAt(0));
        zip.file(`${sfxId}.mp3`, binaryData);
        successCount++;
        onProgress?.(i + 1, entries.length, sfxId, true);
      } else {
        console.error(`Failed to generate ${sfxId}:`, result.error);
        onProgress?.(i + 1, entries.length, sfxId, false);
      }
    } catch (error) {
      console.error(`Error generating ${sfxId}:`, error);
      onProgress?.(i + 1, entries.length, sfxId, false);
    }

    // Delay between requests to avoid rate limiting
    if (i < entries.length - 1) {
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  if (successCount === 0) {
    throw new Error('No SFX files were generated successfully');
  }

  return await zip.generateAsync({ type: 'blob' });
}

// Predefined SFX prompts for the game
export const GAME_SFX_PROMPTS: Record<string, { prompt: string; duration?: number }> = {
  // UI Sounds
  'button-click': { prompt: 'Short soft wooden button click, medieval UI sound, gentle tap', duration: 0.5 },
  'button-hover': { prompt: 'Very subtle soft hover sound, light brush, whisper quiet', duration: 0.3 },
  'gold-button-click': { prompt: 'Satisfying golden coin tap with magical shimmer, fantasy UI confirm sound', duration: 0.6 },
  'menu-open': { prompt: 'Parchment scroll unrolling sound, paper rustling, medieval menu open', duration: 0.8 },
  'menu-close': { prompt: 'Parchment scroll rolling up sound, paper closing, menu dismiss', duration: 0.6 },
  
  // Game Actions
  'coin-gain': { prompt: 'Fantasy gold coins clinking together, treasure gained, money received, cheerful', duration: 1.0 },
  'coin-spend': { prompt: 'Single gold coin dropping into pouch, money spent, transaction complete', duration: 0.7 },
  'item-buy': { prompt: 'Medieval merchant transaction, item purchased, satisfied ding with cloth rustling', duration: 1.0 },
  'item-equip': { prompt: 'Sword sliding into sheath, armor equipping, metal clicking into place, heroic', duration: 0.8 },
  'success': { prompt: 'Triumphant fantasy success fanfare, short magical chime, quest complete', duration: 1.2 },
  'error': { prompt: 'Soft negative buzz, medieval wrong answer, gentle rejection sound', duration: 0.6 },
  
  // Movement & Locations  
  'footstep': { prompt: 'Single footstep on stone cobblestone, medieval walking sound', duration: 0.4 },
  'door-open': { prompt: 'Wooden tavern door creaking open, medieval door swing, entering building', duration: 1.0 },
  
  // Work & Education
  'work-complete': { prompt: 'Satisfied work completion sound, hammer final hit, craft finished', duration: 0.8 },
  'study': { prompt: 'Book pages turning, quill writing on parchment, scholarly ambient', duration: 1.0 },
  'graduation': { prompt: 'Triumphant graduation fanfare, achievement unlocked, magical success', duration: 1.5 },
  
  // Combat & Dungeon
  'sword-hit': { prompt: 'Sword clash impact, metal on metal, combat hit, fantasy battle', duration: 0.6 },
  'damage-taken': { prompt: 'Impact grunt, damage received, armor taking hit, painful but not graphic', duration: 0.5 },
  'victory-fanfare': { prompt: 'Heroic victory fanfare, battle won, triumphant medieval brass', duration: 2.0 },
  'defeat': { prompt: 'Somber defeat sound, battle lost, sad descending notes, game over', duration: 1.5 },
  
  // Events
  'notification': { prompt: 'Medieval bell ding, gentle notification, attention chime', duration: 0.6 },
  'turn-start': { prompt: 'New turn beginning, page turning, ready for action, subtle hopeful', duration: 0.8 },
  'week-end': { prompt: 'Week ending chime, time passing, clock striking, transitional sound', duration: 1.2 },

  // New game event sounds
  'robbery': { prompt: 'Dark sneaky thief stealing, coins falling, sinister chuckle, medieval robbery alert', duration: 1.2 },
  'heal': { prompt: 'Magical healing spell, warm shimmer, fantasy restoration, gentle sparkle ascending', duration: 1.0 },
  'quest-accept': { prompt: 'Parchment scroll unrolling with wax seal stamp, quest accepted, adventure begins', duration: 0.8 },
  'quest-complete': { prompt: 'Triumphant quest completion, medieval brass fanfare, achievement unlocked, reward received', duration: 1.5 },
  'level-up': { prompt: 'Glorious level up fanfare, ascending magical chimes, power gained, fantasy promotion', duration: 1.5 },
  'appliance-break': { prompt: 'Medieval device breaking, gears crunching, pottery smashing, something broke', duration: 1.0 },
  'dice-roll': { prompt: 'Wooden dice rolling on table, medieval gambling, bouncing dice, tavern game', duration: 1.0 },
  'death': { prompt: 'Dark somber death sound, descending ominous tones, spirit departing, medieval funeral bell', duration: 2.0 },
  'resurrection': { prompt: 'Magical resurrection spell, ascending bright tones, life restored, divine miracle', duration: 1.5 },
  'rent-paid': { prompt: 'Gold coins placed on counter, official receipt stamp, medieval transaction complete', duration: 0.8 },
  'weather-thunder': { prompt: 'Distant thunder rolling across sky, medieval storm approaching, atmospheric rumble', duration: 2.0 },
  'festival': { prompt: 'Medieval festival celebration, crowd cheering, music and merriment, festive horns', duration: 1.5 },
  'travel-event': { prompt: 'Mysterious encounter on the road, adventure chime, medieval traveler alert', duration: 0.8 },
};
