import { useState } from 'react';
import type { HomeItemPositions } from '@/types/game.types';

/** All items that can appear in a player's home room */
export const ALL_HOME_ITEMS: { id: string; icon: string; label: string; type: 'appliance' | 'durable' }[] = [
  // Appliances
  { id: 'scrying-mirror',       icon: '\u{1FA9E}', label: 'Scrying Mirror',    type: 'appliance' },
  { id: 'simple-scrying-glass', icon: '\u{1F52E}', label: 'Scrying Glass',     type: 'appliance' },
  { id: 'memory-crystal',       icon: '\u{1F48E}', label: 'Memory Crystal',    type: 'appliance' },
  { id: 'music-box',            icon: '\u{1F3B5}', label: 'Music Box',         type: 'appliance' },
  { id: 'cooking-fire',         icon: '\u{1F525}', label: 'Cooking Fire',      type: 'appliance' },
  { id: 'preservation-box',     icon: '\u{1F4E6}', label: 'Preservation Box',  type: 'appliance' },
  { id: 'arcane-tome',          icon: '\u{1F4D6}', label: 'Arcane Tome',       type: 'appliance' },
  { id: 'frost-chest',          icon: '\u2744\uFE0F', label: 'Frost Chest',   type: 'appliance' },
  // Durables
  { id: 'candles',      icon: '\u{1F56F}\uFE0F', label: 'Candles',       type: 'durable' },
  { id: 'blanket',      icon: '\u{1F6CF}\uFE0F', label: 'Blanket',       type: 'durable' },
  { id: 'furniture',    icon: '\u{1FA91}',        label: 'Furniture',     type: 'durable' },
  { id: 'glow-orb',     icon: '\u{1F4A1}',        label: 'Glow Orb',      type: 'durable' },
  { id: 'warmth-stone', icon: '\u{1FAA8}',        label: 'Warmth Stone',  type: 'durable' },
  { id: 'dagger',       icon: '\u{1F5E1}\uFE0F',  label: 'Dagger',        type: 'durable' },
  { id: 'sword',        icon: '\u2694\uFE0F',     label: 'Sword',         type: 'durable' },
  { id: 'shield',       icon: '\u{1F6E1}\uFE0F',  label: 'Shield',        type: 'durable' },
];

/** Item icon: tries a JPG from public/items/, falls back to emoji */
function ItemIcon({ itemId, icon, label }: { itemId: string; icon: string; label: string }) {
  const [imgFailed, setImgFailed] = useState(false);
  const src = `${import.meta.env.BASE_URL}items/${itemId}.png`;

  if (!imgFailed) {
    return (
      <img
        src={src}
        alt={label}
        draggable={false}
        onError={() => setImgFailed(true)}
        style={{
          width: 40,
          height: 40,
          objectFit: 'cover',
          borderRadius: 4,
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      />
    );
  }
  return (
    <span
      style={{
        fontSize: '1.8rem',
        lineHeight: 1,
        filter: 'drop-shadow(1px 1px 3px rgba(0,0,0,0.7))',
        userSelect: 'none',
        pointerEvents: 'none',
      }}
    >
      {icon}
    </span>
  );
}

interface ZoneEditorHomePanelProps {
  containerRef: React.RefObject<HTMLDivElement>;
  handleMouseMove: (e: React.MouseEvent) => void;
  homeItemPositions: HomeItemPositions;
  homeRoomType: 'slums' | 'noble';
  setHomeRoomType: (type: 'slums' | 'noble') => void;
  selectedHomeItem: string | null;
  setSelectedHomeItem: (id: string | null) => void;
  handleHomeItemMouseDown: (e: React.MouseEvent, itemId: string) => void;
  setHomeItemPositions: (updater: (prev: HomeItemPositions) => HomeItemPositions) => void;
}

export function ZoneEditorHomePanel({
  containerRef,
  handleMouseMove,
  homeItemPositions,
  homeRoomType,
  setHomeRoomType,
  selectedHomeItem,
  setSelectedHomeItem,
  handleHomeItemMouseDown,
  setHomeItemPositions,
}: ZoneEditorHomePanelProps) {
  const bgImage = homeRoomType === 'noble'
    ? `${import.meta.env.BASE_URL}locations/noble-heights.jpg`
    : `${import.meta.env.BASE_URL}locations/slums.jpg`;

  const selectedItemData = selectedHomeItem
    ? ALL_HOME_ITEMS.find(i => i.id === selectedHomeItem)
    : null;
  const selectedPos = selectedHomeItem ? homeItemPositions[selectedHomeItem] : null;

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Main canvas */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Room type toggle */}
        <div className="bg-gray-800 px-4 py-2 flex items-center gap-3">
          <span className="text-gray-300 text-sm font-medium">Room:</span>
          <div className="flex bg-gray-700 rounded overflow-hidden">
            <button
              onClick={() => setHomeRoomType('noble')}
              className={`px-3 py-1 text-sm font-medium transition-colors ${
                homeRoomType === 'noble'
                  ? 'bg-yellow-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Noble Heights
            </button>
            <button
              onClick={() => setHomeRoomType('slums')}
              className={`px-3 py-1 text-sm font-medium transition-colors ${
                homeRoomType === 'slums'
                  ? 'bg-orange-700 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Slums
            </button>
          </div>
          <span className="text-gray-500 text-xs ml-4">
            Drag items to reposition them in the room. Positions apply to both room types.
          </span>
        </div>

        {/* Room scene */}
        <div
          ref={containerRef}
          className="flex-1 relative overflow-hidden cursor-default select-none"
          onMouseMove={handleMouseMove}
          onClick={() => setSelectedHomeItem(null)}
          style={{ minHeight: 0 }}
        >
          {/* Background image */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${bgImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          {/* Overlay */}
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.2)' }} />

          {/* Draggable items */}
          {ALL_HOME_ITEMS.map(item => {
            const pos = homeItemPositions[item.id];
            if (!pos) return null;
            const isSelected = selectedHomeItem === item.id;

            return (
              <div
                key={item.id}
                className="absolute flex flex-col items-center"
                style={{
                  left: `${pos.left}%`,
                  bottom: `${pos.bottom}%`,
                  transform: 'translateX(-50%)',
                  cursor: 'grab',
                  zIndex: isSelected ? 20 : 10,
                  outline: isSelected ? '2px solid #fbbf24' : undefined,
                  outlineOffset: '3px',
                  borderRadius: 4,
                  padding: '2px',
                }}
                title={`${item.label}\nLeft: ${pos.left.toFixed(1)}%  Bottom: ${pos.bottom.toFixed(1)}%`}
                onMouseDown={e => {
                  e.stopPropagation();
                  handleHomeItemMouseDown(e, item.id);
                }}
                onClick={e => {
                  e.stopPropagation();
                  setSelectedHomeItem(item.id);
                }}
              >
                <ItemIcon itemId={item.id} icon={item.icon} label={item.label} />
                {isSelected && (
                  <span
                    style={{
                      fontSize: '0.55rem',
                      color: '#fbbf24',
                      background: 'rgba(0,0,0,0.7)',
                      borderRadius: 2,
                      padding: '1px 3px',
                      marginTop: 2,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {pos.left.toFixed(1)}% / {pos.bottom.toFixed(1)}%
                  </span>
                )}
                {/* Type badge */}
                <span
                  style={{
                    fontSize: '0.45rem',
                    color: item.type === 'appliance' ? '#a78bfa' : '#6ee7b7',
                    background: 'rgba(0,0,0,0.6)',
                    borderRadius: 2,
                    padding: '1px 2px',
                    marginTop: 1,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right properties panel */}
      <div className="w-64 bg-gray-800 border-l border-gray-700 flex flex-col overflow-y-auto">
        <div className="p-3 border-b border-gray-700">
          <h3 className="text-white font-bold text-sm">Home Layout</h3>
          <p className="text-gray-400 text-xs mt-1">
            {selectedHomeItem
              ? `Selected: ${selectedItemData?.label || selectedHomeItem}`
              : 'Click an item to select it'}
          </p>
        </div>

        {/* Selected item numeric inputs */}
        {selectedHomeItem && selectedPos && (
          <div className="p-3 border-b border-gray-700">
            <div className="text-gray-300 text-xs font-semibold mb-2">
              {selectedItemData?.label}
              <span className="ml-2 text-gray-500 font-normal">
                ({selectedItemData?.type})
              </span>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-gray-400 text-xs">
                <span className="w-14">Left %</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={selectedPos.left}
                  onChange={e => {
                    const v = parseFloat(e.target.value);
                    if (isNaN(v)) return;
                    setHomeItemPositions(prev => ({
                      ...prev,
                      [selectedHomeItem]: { ...prev[selectedHomeItem], left: Math.max(0, Math.min(100, v)) },
                    }));
                  }}
                  className="flex-1 bg-gray-700 text-white rounded px-2 py-1 text-xs"
                />
              </label>
              <label className="flex items-center gap-2 text-gray-400 text-xs">
                <span className="w-14">Bottom %</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={selectedPos.bottom}
                  onChange={e => {
                    const v = parseFloat(e.target.value);
                    if (isNaN(v)) return;
                    setHomeItemPositions(prev => ({
                      ...prev,
                      [selectedHomeItem]: { ...prev[selectedHomeItem], bottom: Math.max(0, Math.min(100, v)) },
                    }));
                  }}
                  className="flex-1 bg-gray-700 text-white rounded px-2 py-1 text-xs"
                />
              </label>
            </div>
          </div>
        )}

        {/* Item list */}
        <div className="p-3 flex-1">
          <div className="text-gray-400 text-xs font-semibold mb-2">All Items</div>
          {['appliance', 'durable'].map(type => (
            <div key={type} className="mb-3">
              <div className="text-xs text-gray-500 mb-1 capitalize">{type}s</div>
              {ALL_HOME_ITEMS.filter(i => i.type === type).map(item => {
                const pos = homeItemPositions[item.id];
                const isSelected = selectedHomeItem === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedHomeItem(isSelected ? null : item.id)}
                    className={`w-full text-left px-2 py-1 rounded text-xs mb-0.5 flex items-center gap-1.5 transition-colors ${
                      isSelected
                        ? 'bg-yellow-600/30 text-yellow-300'
                        : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span className="flex-1">{item.label}</span>
                    {pos && (
                      <span className="text-gray-600 text-[0.6rem]">
                        {pos.left.toFixed(0)}/{pos.bottom.toFixed(0)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Hint */}
        <div className="p-3 border-t border-gray-700">
          <p className="text-gray-500 text-xs">
            Positions saved with &quot;Apply &amp; Save&quot; and applied to the live game room.
            Place <code className="text-gray-400">public/items/&#123;id&#125;.jpg</code> to show item images.
          </p>
        </div>
      </div>
    </div>
  );
}
