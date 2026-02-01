# Sections Components

This directory contains landing page section components extracted from the original `ParentHomePage.tsx`.

## Components to Create

1. **HeroSection.tsx** ✅ (Created as example)
2. **ScienceSection.tsx** (To be created)
3. **TutorSection.tsx** (To be created)
4. **SafetySection.tsx** (To be created)
5. **HowItWorksSection.tsx** (To be created)
6. **CTASection.tsx** (To be created)

## Pattern for Creating Sections

Each section should follow this pattern:

```tsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
// Import UI components as needed

interface SectionProps {
  // Props specific to section
}

const SectionComponent: React.FC<SectionProps> = ({ ...props }) => {
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();
  // Use hooks as needed

  return (
    <section className={...}>
      {/* Section content */}
    </section>
  );
};

export default SectionComponent;
```

## Extraction Guidelines

1. Extract each section from `ParentHomePage.tsx`
2. Replace inline styles with CSS classes (move to `src/styles/`)
3. Use reusable components from `src/components/ui/`
4. Maintain translations via `useTranslation`
5. Support dark mode via `useTheme`
6. Use appropriate hooks (`useScrollAnimation`, `useParallax`)
7. Accept callbacks as props for interactions
8. Keep components focused and single-purpose

## Reference

See `HeroSection.tsx` for a complete example of how to structure sections.

