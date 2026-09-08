/** Raster props share the same painted surfaces in both 1536 × 1024 rooms.
 * Coordinates are in scene space, so resizing never moves a book off its shelf. */
export interface RoomPlacement { x: number; y: number; width: number; height: number; label: string }
export const ROOM_ITEMS: Record<string, RoomPlacement> = {
  'scrying-mirror': { x:440,y:180,width:170,height:265,label:'Scrying Mirror' },
  'simple-scrying-glass': { x:674,y:392,width:90,height:90,label:'Scrying Glass' },
  'memory-crystal': { x:786,y:215,width:90,height:102,label:'Memory Crystal' },
  'music-box': { x:846,y:395,width:112,height:86,label:'Music Box' },
  'cooking-fire': { x:1342,y:490,width:160,height:208,label:'Cooking Fire' },
  'preservation-box': { x:994,y:570,width:150,height:85,label:'Preservation Box' },
  'arcane-tome': { x:763,y:420,width:96,height:64,label:'Arcane Tome' },
  'frost-chest': { x:1070,y:725,width:215,height:144,label:'Frost Chest' },
  'candles': { x:654,y:374,width:56,height:112,label:'Candles' },
  'blanket': { x:189,y:550,width:384,height:135,label:'Warm Blanket' },
  'furniture': { x:671,y:573,width:184,height:234,label:'Comfortable Furniture' },
  'glow-orb': { x:873,y:244,width:65,height:77,label:'Glow Orb' },
  'warmth-stone': { x:1242,y:695,width:66,height:46,label:'Warmth Stone' },
  'encyclopedia': { x:1018,y:231,width:196,height:83,label:'Encyclopedia' },
  'dictionary': { x:1018,y:350,width:75,height:72,label:'Dictionary' },
  'atlas': { x:1108,y:370,width:107,height:51,label:'Atlas' },
};
