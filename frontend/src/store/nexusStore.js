import { create } from 'zustand';
import { DEFAULT_THEME_ID } from '../config/themes';

export const useNexusStore = create((set) => ({
  // Core State
  engineMode: 'algorithm', // 'cloud_ai' | 'local_ai' | 'algorithm'
  isConfigModalOpen: false,
  
  // System Configuration (Replaces .env)
  systemConfig: {
    geminiApiKey: '',
    terminologyServer: 'hl7_tho', // 'hl7_tho' | 'cdc_phin' | 'local_mock'
    ollamaUrl: 'http://localhost:11434',
    activeModel: '',
    availableModels: [],
    layoutMode: 'modern',
    themeId: DEFAULT_THEME_ID,
  },

  // UI State
  activeTab: 'generate',
  activeSubTab: 'form_builder',
  
  // Real-time Event Bus
  eventBus: [],
  isLogPaused: false,
  
  // Active Data
  currentMessage: '',
  parsedMessage: null,
  validationResult: null,

  // Agent/Processor State
  processors: {
    lexer: { status: 'IDLE', metrics: {} },
    parser: { status: 'IDLE', metrics: {} },
    validator: { status: 'IDLE', metrics: {} },
    generator: { status: 'IDLE', metrics: {} },
  },
  agents: {
    syntax: { status: 'IDLE', metrics: {} },
    semantic: { status: 'IDLE', metrics: {} },
    compliance: { status: 'IDLE', metrics: {} },
  },
  
  // Actions
  setEngineMode: (mode) => set({ engineMode: mode }),
  setConfigModalOpen: (isOpen) => set({ isConfigModalOpen: isOpen }),
  updateSystemConfig: (updates) => set((state) => ({ 
    systemConfig: { ...state.systemConfig, ...updates } 
  })),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setActiveSubTab: (subTab) => set({ activeSubTab: subTab }),
  setCurrentMessage: (msg) => set({ currentMessage: msg }),
  
  addEvent: (event) => set((state) => ({
    // Keep last 200 events to prevent memory leaks
    eventBus: [...state.eventBus, event].slice(-200)
  })),

  clearEventBus: () => set({ eventBus: [] }),
  setLogPaused: (paused) => set({ isLogPaused: paused }),

  updateProcessorStatus: (processor, status, metrics) => set((state) => ({
    processors: {
      ...state.processors,
      [processor]: { status, metrics: { ...state.processors[processor].metrics, ...metrics } }
    }
  })),

  updateAgentStatus: (agent, status, metrics) => set((state) => ({
    agents: {
      ...state.agents,
      [agent]: { status, metrics: { ...state.agents[agent].metrics, ...metrics } }
    }
  })),
}));
