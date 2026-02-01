# Fuzzling's Advanced Playpen

## Overview

Fuzzling's Advanced Playpen is a sophisticated physics-based puzzle game that combines strategic berry dropping with meta-progression systems. Players drop colorful berries into a playpen, merge them to create higher-tier berries, and unlock permanent upgrades through a stardust economy.

## Key Features

### 🎮 Core Gameplay
- **Physics-Based Mechanics**: Realistic physics simulation using Box2D
- **Berry Merging System**: Combine same-tier, same-affinity berries to create higher-tier ones
- **Cross-Affinity Combos**: Special combinations (Sun + Moon = Eclipse) create powerful explosions
- **Fluid Particle System**: Advanced particle effects for high-tier berry merges

### 🌟 Meta-Progression System
- **Stardust Economy**: Earn stardust by playing, spend on permanent upgrades
- **Talent Tree**: Unlock permanent bonuses like bigger playpen and affinity attunement
- **Cosmetic System**: Unlock and select different berry colors
- **Fuzzling Types**: Choose between Sunny (bonus joy) and Dusty (slippery berries)

### 🎵 Audio Integration
- **Background Music**: Integrated with existing music files from `/public/assets/music/`
- **Music Controls**: Toggle music on/off with visual feedback
- **Audio Persistence**: Music preferences saved between sessions

### 🎨 Visual Features
- **Dracula Theme**: Dark theme with vibrant colors
- **Smooth Animations**: Fluid transitions and particle effects
- **Event Warnings**: Dynamic visual alerts for special events
- **Responsive Design**: Adapts to different screen sizes

## Technical Implementation

### Physics Engine
- **Box2D Integration**: Full physics simulation with realistic gravity and collisions
- **Particle System**: Advanced fluid simulation for special effects
- **Contact Detection**: Automatic berry merging through collision detection

### State Management
- **Local Storage**: Persistent progress saving (version v3)
- **React Hooks**: Optimized with useCallback for performance
- **TypeScript**: Fully typed interfaces for game and meta states

### Performance Optimizations
- **Canvas Rendering**: Efficient 2D rendering with hardware acceleration
- **Memory Management**: Proper cleanup of physics bodies and game loops
- **Event Handling**: Optimized mouse and touch controls

## Game Mechanics

### Berry Tiers
1. **Tier 0**: Small red berries (Sun affinity)
2. **Tier 1**: Medium green berries (Earth affinity)
3. **Tier 2**: Large purple berries (Moon affinity)
4. **Tier 3**: Extra large orange berries (Sun affinity)
5. **Tier 4**: Huge yellow berries (Earth affinity)
6. **Tier 5**: Massive cyan berries (Moon affinity)

### Affinity System
- **Sun Affinity**: Red and orange berries
- **Earth Affinity**: Green and yellow berries
- **Moon Affinity**: Purple and cyan berries
- **Cross-Affinity**: Sun + Moon creates powerful explosions

### Talents
- **Bigger Playpen**: Increases play area by 5%
- **Cozy Start**: Begin with 50 joy points
- **Affinity Attunement**: 33% chance for preferred affinity berries

### Fuzzling Types
- **Sunny Fuzzling**: +10% joy gain from all sources
- **Dusty Fuzzling**: Berries have reduced friction (more slippery)

## Installation & Dependencies

### Required Packages
```bash
npm install box2d-wasm
```

### Music Files
The game uses music files from the existing repository:
- `/public/assets/music/Natural Vibes.mp3` - Background music

### TypeScript Declarations
Added to `src/vite-env.d.ts`:
```typescript
declare global {
  interface Window {
    box2dwasm: () => Promise<any>;
  }
}
```

## Integration

### Playground Integration
The game is seamlessly integrated into the playground with:
- Consistent UI/UX with other games
- Proper modal management
- Fullscreen support
- Audio controls

### File Structure
```
src/components/games/
├── FuzzlingAdvancedGame.tsx    # Main game component
└── ... (other games)

src/pages/
└── PlaygroundPage.tsx          # Updated to include new game
```

## Game States

### Main Menu
- Talent tree with purchasable upgrades
- Cosmetic shop for berry colors
- Fuzzling type selection
- Stardust display

### In-Game
- Real-time physics simulation
- Score tracking
- Event warnings
- Music controls

### Post-Game
- Final score display
- Stardust earned
- Return to main menu option

## Events & Special Features

### Windy Day Event
- Triggers after 20 seconds
- Changes gravity direction
- Visual warning system
- Affects all physics objects

### Fluid Effects
- High-tier berry merges create fluid splashes
- Particle system with realistic physics
- Temporary visual effects

### Explosion Mechanics
- Cross-affinity combos create explosions
- Affects nearby physics objects
- Realistic force application

## Performance Considerations

### Memory Management
- Proper cleanup of physics bodies
- Canvas context management
- Audio element cleanup
- Event listener removal

### Rendering Optimization
- Efficient canvas rendering
- Minimal DOM manipulation
- Hardware-accelerated graphics

### Physics Optimization
- Limited particle count
- Efficient collision detection
- Optimized world stepping

## Future Enhancements

### Potential Additions
- More berry types and affinities
- Additional talent tree branches
- Seasonal events and themes
- Multiplayer features
- Achievement system

### Technical Improvements
- WebGL rendering for better performance
- Advanced particle effects
- Sound effects for interactions
- Mobile touch optimization

## Troubleshooting

### Common Issues
1. **Box2D not loading**: Check internet connection for CDN
2. **Audio not playing**: Verify music file exists in `/public/assets/music/`
3. **Performance issues**: Reduce particle count or disable effects
4. **Save data corruption**: Clear localStorage and restart

### Debug Features
- Console logging for physics events
- Performance monitoring
- State inspection tools

## Credits

- **Physics Engine**: Box2D (via box2d-wasm)
- **Audio**: Natural Vibes.mp3 from music repository
- **Icons**: Lucide React icons
- **Styling**: Tailwind CSS with custom Dracula theme 