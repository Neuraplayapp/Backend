# Plasma Ball Modal Component

A stunning modal component featuring a real-time Three.js plasma ball effect with interactive shader animations. This component recreates the original plasma ball effect from the provided code, adapted for React with TypeScript support.

## Features

- 🌟 **Real-time Three.js shader animation** - Beautiful animated plasma ball effect
- 🎯 **Interactive mouse tracking** - Shader responds to mouse movement
- 📱 **Responsive design** - Works on all screen sizes
- ✨ **Smooth animations** - Elegant entrance and exit transitions
- 🎨 **Customizable content** - Support for any React content
- 🔧 **TypeScript support** - Fully typed for better development experience
- 🎭 **Original shader code** - Faithfully recreated from the original implementation

## Installation

The component uses Three.js which is already installed in your project. No additional dependencies required.

## Basic Usage

```tsx
import React, { useState } from 'react';
import PlasmaBallModal from './components/PlasmaBallModal';

const MyComponent = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div>
      <button onClick={() => setIsModalOpen(true)}>
        Open Plasma Ball Modal
      </button>

      <PlasmaBallModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Welcome!"
      >
        <p>Your content here...</p>
      </PlasmaBallModal>
    </div>
  );
};
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isOpen` | `boolean` | Yes | Controls modal visibility |
| `onClose` | `() => void` | Yes | Callback when modal is closed |
| `children` | `React.ReactNode` | No | Content to display in modal |
| `title` | `string` | No | Optional title for the modal |
| `className` | `string` | No | Additional CSS classes |

## Technical Details

### Shader Implementation

The component uses the exact same shader code as the original implementation:

- **Vertex Shader**: Simple pass-through shader for position
- **Fragment Shader**: Complex plasma effect with:
  - Fractal noise generation with 5 octaves
  - Environment mapping for reflections
  - Dynamic lighting calculations
  - Real-time plasma physics simulation
  - Interactive mouse tracking

### Three.js Setup

- Uses `THREE.PlaneGeometry(2, 2)` for the shader surface
- Loads external textures for noise and environment mapping
- Implements proper cleanup and memory management
- Handles window resize events

### Performance Optimizations

- Automatic cleanup of animation frames
- Proper disposal of Three.js resources
- Efficient texture loading with error handling
- Responsive canvas sizing

## Advanced Usage

### Custom Styling

```tsx
<PlasmaBallModal
  isOpen={isModalOpen}
  onClose={closeModal}
  title="Custom Modal"
  className="my-custom-modal"
>
  <div className="custom-content">
    <h3>Custom Content</h3>
    <p>Your custom content here...</p>
  </div>
</PlasmaBallModal>
```

### Demo Component

A demo component is included (`PlasmaBallDemo.tsx`) that showcases the modal functionality:

```tsx
import PlasmaBallDemo from './components/PlasmaBallDemo';

// Use in your app
<PlasmaBallDemo />
```

## CSS Classes

The component uses the following CSS classes that can be customized:

- `.plasma-ball-modal-overlay` - Main overlay container
- `.plasma-ball-modal-container` - Modal container
- `.plasma-ball-background` - Three.js canvas container
- `.plasma-ball-content` - Content wrapper
- `.plasma-ball-title` - Title styling
- `.plasma-ball-body` - Body content
- `.plasma-ball-close-btn` - Close button

## Browser Support

- Modern browsers with WebGL support
- Requires Three.js compatibility
- Responsive design for mobile devices

## Performance Notes

- The shader effect is GPU-intensive
- Recommended for desktop use primarily
- Mobile devices may experience reduced performance
- Automatic cleanup prevents memory leaks

## Troubleshooting

### Common Issues

1. **White screen**: Check if Three.js is properly loaded
2. **No animation**: Ensure textures are loading correctly
3. **Performance issues**: Check device WebGL support
4. **Memory leaks**: Ensure proper cleanup in parent components

### Debug Mode

Enable console logging by adding debug statements in the component:

```tsx
console.log('PlasmaBallModal: Initializing...');
```

## License

This component is based on the original plasma ball shader code and adapted for React/TypeScript use. 