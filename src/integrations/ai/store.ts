import type { WritableDraft } from "immer";

import { createJSONStorage, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { create } from "zustand/react";

import type { AIProvider } from "./types";

type TestStatus = "unverified" | "success" | "failure";

type AIStoreState = {
  enabled: boolean;
  provider: AIProvider;
  model: string;
  // API key is NOT persisted - must be re-entered each session for security
  apiKey: string;
  baseURL: string;
  testStatus: TestStatus;
};

type AIStoreActions = {
  canEnable: () => boolean;
  setEnabled: (value: boolean) => void;
  set: (fn: (draft: WritableDraft<AIStoreState>) => void) => void;
  reset: () => void;
  // New action to validate API key format without storing it
  validateApiKeyFormat: (provider: AIProvider, key: string) => boolean;
};

type AIStore = AIStoreState & AIStoreActions;

const initialState: AIStoreState = {
  enabled: false,
  provider: "openai",
  model: "",
  apiKey: "",
  baseURL: "",
  testStatus: "unverified",
};

/**
 * Validates API key format based on provider.
 * This allows users to verify they've entered the correct format
 * without storing the key.
 */
function validateApiKeyFormat(provider: AIProvider, key: string): boolean {
  if (!key || key.length < 10) return false;

  switch (provider) {
    case "openai":
      // OpenAI keys start with sk- and have specific format
      return /^sk-[a-zA-Z0-9]{20,}$/.test(key) || /^sk-proj-[a-zA-Z0-9]{20,}$/.test(key);
    case "anthropic":
      // Anthropic keys start with sk-ant-
      return /^sk-ant-[a-zA-Z0-9]{20,}$/.test(key);
    case "gemini":
      // Gemini keys are typically long alphanumeric strings
      return /^[a-zA-Z0-9-_]{20,}$/.test(key);
    case "vercel-ai-gateway":
    case "openrouter":
    case "ollama":
      // These providers may have various key formats
      return key.length >= 10;
    default:
      return key.length >= 10;
  }
}

/**
 * Session-only storage that does not persist API keys.
 * Other settings (provider, model, baseURL) are persisted for convenience.
 */
const secureSessionStorage = {
  getItem: (name: string): string | null => {
    try {
      return window.sessionStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string): void => {
    try {
      window.sessionStorage.setItem(name, value);
    } catch {
      // Ignore storage errors
    }
  },
  removeItem: (name: string): void => {
    try {
      window.sessionStorage.removeItem(name);
    } catch {
      // Ignore storage errors
    }
  },
};

export const useAIStore = create<AIStore>()(
  persist(
    immer((set, get) => ({
      ...initialState,
      validateApiKeyFormat,
      set: (fn) => {
        set((draft) => {
          const prev = {
            provider: draft.provider,
            model: draft.model,
            apiKey: draft.apiKey,
            baseURL: draft.baseURL,
          };

          fn(draft);

          if (
            draft.provider !== prev.provider ||
            draft.model !== prev.model ||
            draft.apiKey !== prev.apiKey ||
            draft.baseURL !== prev.baseURL
          ) {
            draft.testStatus = "unverified";
            draft.enabled = false;
          }
        });
      },
      reset: () => set(() => initialState),
      canEnable: () => {
        const { testStatus } = get();
        return testStatus === "success";
      },
      setEnabled: (value: boolean) => {
        const canEnable = get().canEnable();
        if (value && !canEnable) return;
        set((draft) => {
          draft.enabled = value;
        });
      },
    })),
    {
      name: "ai-store",
      // Use sessionStorage instead of localStorage for better security
      storage: createJSONStorage(() => secureSessionStorage),
      partialize: (state) => ({
        // NOTE: apiKey is intentionally NOT persisted for security
        // Users must re-enter their API key each session
        enabled: state.enabled,
        provider: state.provider,
        model: state.model,
        baseURL: state.baseURL,
        testStatus: state.testStatus,
      }),
    },
  ),
);