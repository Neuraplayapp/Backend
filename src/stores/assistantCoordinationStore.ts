import { create } from 'zustand';

/**
 * Coordinates visibility between different assistant components
 * to prevent them from overlapping/intercepting each other.
 */
interface AssistantCoordinationState {
  /** True when NeuraPlayAssistantLite (fullscreen) is open */
  fullscreenAssistantOpen: boolean;
  setFullscreenAssistantOpen: (open: boolean) => void;
}

export const useAssistantCoordination = create<AssistantCoordinationState>((set) => ({
  fullscreenAssistantOpen: false,
  setFullscreenAssistantOpen: (open) => set({ fullscreenAssistantOpen: open }),
}));




