import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  Check,
  Copy,
  FileText,
  Loader2,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import { apiClient } from '../../api/client';
import { buildAiRequestConfig, getSelectedModel } from '../../api/aiPayload';
import { useNexusStore } from '../../store/nexusStore';
import { API } from '../../config/api';

const FIELD_INPUT_TYPES = new Set([
  'email',
  'number',
  'password',
  'search',
  'tel',
  'text',
  'url',
]);

const tabLabels = {
  generate: 'Build Message',
  parse: 'Parse & Validate',
  validate: 'Parse & Validate',
  diff: 'Compare Messages',
  batch: 'Batch Processing',
  nl_input: 'Clinical NLP',
};

const createId = (prefix) => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const trimText = (value, max = 4000) => {
  const text = `${value || ''}`;
  return text.length > max ? `${text.slice(0, max)}...` : text;
};

const isFieldElement = (element) => {
  if (!element || !(element instanceof HTMLElement)) return false;
  if (element.closest('.nexus-chat-assistant')) return false;
  if (element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) return true;
  if (element instanceof HTMLInputElement) return FIELD_INPUT_TYPES.has(element.type || 'text');
  return element.isContentEditable;
};

const labelFromElement = (element) => {
  const labelText = element.labels
    ? Array.from(element.labels).map((label) => label.textContent?.trim()).filter(Boolean).join(' ')
    : '';

  const explicitLabel = element.id
    ? document.querySelector(`label[for="${CSS.escape(element.id)}"]`)?.textContent?.trim()
    : '';

  return trimText(
    labelText
      || explicitLabel
      || element.getAttribute('aria-label')
      || element.getAttribute('title')
      || element.getAttribute('placeholder')
      || element.getAttribute('name')
      || element.tagName.toLowerCase(),
    120
  );
};

const describeField = (element, activeTab, activeSubTab) => {
  const value = element instanceof HTMLSelectElement
    ? element.value
    : element.isContentEditable
      ? element.textContent
      : element.value;

  return {
    label: labelFromElement(element),
    type: element.tagName.toLowerCase(),
    inputType: element.getAttribute('type') || '',
    name: element.getAttribute('name') || '',
    placeholder: element.getAttribute('placeholder') || '',
    activeTab,
    activeSubTab,
    workflow: tabLabels[activeTab] || activeTab,
    value: trimText(value),
    valueLength: `${value || ''}`.length,
    capturedAt: new Date().toISOString(),
  };
};

const extractReplacementText = (content) => {
  const trimmed = content.trim();
  const codeFence = trimmed.match(/^```[a-zA-Z0-9_-]*\n([\s\S]*?)\n```$/);
  return codeFence ? codeFence[1].trim() : trimmed;
};

const setNativeValue = (element, value) => {
  const prototype = Object.getPrototypeOf(element);
  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
  if (descriptor?.set) {
    descriptor.set.call(element, value);
  } else {
    element.value = value;
  }
};

function HelixAssistantMark({ variant = 'default' }) {
  return (
    <span className={clsx('nexus-assistant-mark', `nexus-assistant-mark--${variant}`)} aria-hidden="true">
      <span className="nexus-assistant-mark__orbit" />
      <Bot className="nexus-assistant-mark__bot" size={variant === 'compact' ? 15 : 17} strokeWidth={2.25} />
      <Sparkles className="nexus-assistant-mark__spark" size={variant === 'compact' ? 8 : 9} strokeWidth={2.5} />
    </span>
  );
}

function FieldContextBadge({ field }) {
  if (!field) {
    return (
      <div className="nexus-chat-field-empty">
        Focus any app field to give the assistant field-level context.
      </div>
    );
  }

  return (
    <div className="nexus-chat-field-card">
      <div className="min-w-0">
        <div className="nexus-chat-field-kicker">Current field</div>
        <div className="nexus-chat-field-name truncate">{field.workflow} / {field.label}</div>
      </div>
      <div className="nexus-chat-field-meta">{field.valueLength} chars</div>
    </div>
  );
}

function MessageBubble({ message, canApply, onApply, onCopy }) {
  const [copied, setCopied] = useState(false);
  const isAssistant = message.role === 'assistant';
  const isLoading = message.status === 'loading';

  const handleCopy = async () => {
    await onCopy(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className={clsx('nexus-chat-message', isAssistant ? 'nexus-chat-message--assistant' : 'nexus-chat-message--user')}>
      <div className="nexus-chat-message-role">
        {isAssistant ? 'Assistant' : 'You'}
        {message.model ? <span>{message.model}</span> : null}
      </div>
      <div className="nexus-chat-message-body">
        {isLoading ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 size={13} className="animate-spin" />
            Processing through the selected AI engine...
          </span>
        ) : (
          message.content
        )}
      </div>
      {isAssistant && !isLoading && message.content ? (
        <div className="nexus-chat-message-actions">
          <button onClick={handleCopy} title="Copy response">
            {copied ? <Check size={12} /> : <Copy size={12} />}
            Copy
          </button>
          <button onClick={() => onApply(message.content)} disabled={!canApply} title="Apply response to the focused field">
            <Wand2 size={12} />
            Apply
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function ChatLauncherButton({ compact = false }) {
  const toggleChatAssistant = useNexusStore((state) => state.toggleChatAssistant);
  const isChatAssistantOpen = useNexusStore((state) => state.isChatAssistantOpen);

  return (
    <button
      type="button"
      onClick={toggleChatAssistant}
      className={clsx(
        'nexus-chat-launcher inline-flex items-center justify-center border transition-colors',
        isChatAssistantOpen ? 'nexus-chat-launcher--active' : null,
        compact ? 'h-9 w-9' : 'h-8 gap-2 px-2.5'
      )}
      title={isChatAssistantOpen ? 'Close Helix Assistant' : 'Open Helix Assistant'}
      aria-label={isChatAssistantOpen ? 'Close Helix Assistant' : 'Open Helix Assistant'}
    >
      <HelixAssistantMark variant={compact ? 'compact' : 'default'} />
      {!compact ? <span>Assistant</span> : null}
    </button>
  );
}

export default function GlobalChatAssistant() {
  const isChatAssistantOpen = useNexusStore((state) => state.isChatAssistantOpen);
  const setChatAssistantOpen = useNexusStore((state) => state.setChatAssistantOpen);
  const chatMessages = useNexusStore((state) => state.chatMessages);
  const addChatMessage = useNexusStore((state) => state.addChatMessage);
  const updateChatMessage = useNexusStore((state) => state.updateChatMessage);
  const clearChatMessages = useNexusStore((state) => state.clearChatMessages);
  const activeAssistantField = useNexusStore((state) => state.activeAssistantField);
  const setActiveAssistantField = useNexusStore((state) => state.setActiveAssistantField);
  const addEvent = useNexusStore((state) => state.addEvent);
  const engineMode = useNexusStore((state) => state.engineMode);
  const setEngineMode = useNexusStore((state) => state.setEngineMode);
  const systemConfig = useNexusStore((state) => state.systemConfig);
  const activeTab = useNexusStore((state) => state.activeTab);
  const activeSubTab = useNexusStore((state) => state.activeSubTab);
  const currentMessage = useNexusStore((state) => state.currentMessage);
  const parsedMessage = useNexusStore((state) => state.parsedMessage);
  const validationResult = useNexusStore((state) => state.validationResult);
  const aiAnalysis = useNexusStore((state) => state.aiAnalysis);

  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const lastFieldElement = useRef(null);
  const scrollRef = useRef(null);

  const isAI = engineMode === 'cloud_ai' || engineMode === 'local_ai';
  const activeModel = getSelectedModel(engineMode, systemConfig);

  const contextPayload = useMemo(() => ({
    active_tab: activeTab,
    active_sub_tab: activeSubTab,
    active_workflow: tabLabels[activeTab] || activeTab,
    focused_field: activeAssistantField,
    current_message_preview: trimText(currentMessage, 2000),
    parsed_message_summary: parsedMessage ? {
      segments: parsedMessage.segments?.length || 0,
      segment_names: parsedMessage.segments?.map((segment) => segment.name).slice(0, 20) || [],
    } : null,
    validation_result: validationResult,
    ai_analysis: aiAnalysis,
    theme_id: systemConfig.themeId,
    layout_mode: systemConfig.layoutMode,
  }), [activeAssistantField, activeSubTab, activeTab, aiAnalysis, currentMessage, parsedMessage, systemConfig.layoutMode, systemConfig.themeId, validationResult]);

  useEffect(() => {
    const updateFieldContext = (target) => {
      if (!isFieldElement(target)) return;
      lastFieldElement.current = target;
      setActiveAssistantField(describeField(target, activeTab, activeSubTab));
    };

    const handleFocus = (event) => updateFieldContext(event.target);
    const handleInput = (event) => {
      if (event.target === lastFieldElement.current) updateFieldContext(event.target);
    };

    document.addEventListener('focusin', handleFocus, true);
    document.addEventListener('input', handleInput, true);
    document.addEventListener('change', handleInput, true);

    return () => {
      document.removeEventListener('focusin', handleFocus, true);
      document.removeEventListener('input', handleInput, true);
      document.removeEventListener('change', handleInput, true);
    };
  }, [activeSubTab, activeTab, setActiveAssistantField]);

  useEffect(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
  }, [chatMessages, isChatAssistantOpen]);

  const copyText = async (text) => {
    await navigator.clipboard.writeText(text);
  };

  const applyToActiveField = (content) => {
    const target = lastFieldElement.current;
    if (!target || !target.isConnected) {
      addEvent({
        type: 'EventType.CHAT_APPLY_SKIPPED',
        timestamp: new Date().toISOString(),
        engine: 'system',
        detail: 'No active field available for assistant apply action',
        severity: 'WARNING',
      });
      return;
    }

    const replacement = extractReplacementText(content);
    if (target.isContentEditable) {
      target.textContent = replacement;
    } else {
      setNativeValue(target, replacement);
    }

    target.dispatchEvent(new Event('input', { bubbles: true }));
    target.dispatchEvent(new Event('change', { bubbles: true }));
    target.focus();
    setActiveAssistantField(describeField(target, activeTab, activeSubTab));

    addEvent({
      type: 'EventType.CHAT_APPLIED',
      timestamp: new Date().toISOString(),
      engine: 'system',
      detail: `Assistant response applied to ${activeAssistantField?.label || 'active field'}`,
      severity: 'INFO',
    });
  };

  const sendMessage = async (content = draft) => {
    const message = content.trim();
    if (!message || isSending || !isAI) return;

    const userMessage = {
      id: createId('user'),
      role: 'user',
      content: message,
      createdAt: new Date().toISOString(),
    };
    const assistantId = createId('assistant');

    addChatMessage(userMessage);
    addChatMessage({
      id: assistantId,
      role: 'assistant',
      content: '',
      status: 'loading',
      createdAt: new Date().toISOString(),
    });
    setDraft('');
    setIsSending(true);

    try {
      const history = chatMessages
        .filter((item) => item.status !== 'loading' && item.content?.trim())
        .slice(-10)
        .map((item) => ({ role: item.role, content: item.content }));

      const response = await apiClient.post(API.CHAT_MESSAGE, {
        ...buildAiRequestConfig(engineMode, systemConfig),
        message,
        history,
        context: contextPayload,
      }, { timeout: 90000 });

      updateChatMessage(assistantId, {
        content: response.data.reply,
        status: 'complete',
        model: response.data.model,
      });
    } catch (err) {
      const detail = err.response?.data?.detail || err.message;
      updateChatMessage(assistantId, {
        content: `ERROR: ${detail}`,
        status: 'error',
      });
    } finally {
      setIsSending(false);
    }
  };

  const quickActions = [
    {
      label: 'Explain field',
      icon: FileText,
      requiresField: true,
      prompt: 'Explain the currently focused field, what kind of value it expects, and any HL7/FHIR implications. Keep it concise.',
    },
    {
      label: 'Fix value',
      icon: Wand2,
      requiresField: true,
      prompt: 'Review the currently focused field value and return only the corrected replacement value. Do not add explanation or markdown.',
    },
    {
      label: 'Validate',
      icon: ShieldCheck,
      requiresField: true,
      prompt: 'Validate the currently focused field value. List concrete issues and the smallest safe correction.',
    },
    {
      label: 'Generate sample',
      icon: Sparkles,
      requiresField: false,
      prompt: 'Generate a realistic HL7-oriented sample for the current workflow. If a field is focused, return only a replacement value for that field.',
    },
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => setChatAssistantOpen(true)}
        className="nexus-chat-mobile-dock nexus-chat-assistant sm:hidden"
        title="Open Helix Assistant"
        aria-label="Open Helix Assistant"
      >
        <HelixAssistantMark variant="dock" />
      </button>

      <AnimatePresence>
        {isChatAssistantOpen && (
          <motion.div
            className="nexus-chat-assistant fixed inset-0 z-[10050] pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.aside
              initial={{ x: 420 }}
              animate={{ x: 0 }}
              exit={{ x: 420 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="nexus-chat-drawer pointer-events-auto absolute right-0 top-0 flex h-full w-[min(420px,100vw)] flex-col"
            >
              <header className="nexus-chat-header">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="nexus-chat-logo">
                    <HelixAssistantMark variant="logo" />
                  </div>
                  <div className="min-w-0">
                    <div className="nexus-chat-title">Helix Assistant</div>
                    <div className="nexus-chat-subtitle truncate">
                      {isAI
                        ? `${engineMode === 'local_ai' ? 'Ollama Local' : systemConfig.cloudProvider === 'gateway' ? 'Gateway' : 'Gemini Cloud'} / ${activeModel}`
                        : 'AI Engine required'}
                    </div>
                  </div>
                </div>
                <button onClick={() => setChatAssistantOpen(false)} className="nexus-chat-icon-button" title="Close assistant">
                  <X size={16} />
                </button>
              </header>

              <div className="nexus-chat-status-row">
                <span className={clsx('nexus-chat-engine-chip', isAI ? 'nexus-chat-engine-chip--ai' : 'nexus-chat-engine-chip--locked')}>
                  {engineMode.replace('_', ' ')}
                </span>
                <span className="nexus-chat-workflow-chip">{tabLabels[activeTab] || activeTab}</span>
              </div>

              <div className="px-4 pt-3">
                <FieldContextBadge field={activeAssistantField} />
              </div>

              {!isAI ? (
                <div className="nexus-chat-ai-required mx-4 mt-3">
                  <div>
                    Assistant inference is linked to AI Engine mode. Select a provider to use the models configured in settings.
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => setEngineMode('cloud_ai')}>Use Gemini</button>
                    <button onClick={() => setEngineMode('local_ai')}>Use Ollama</button>
                  </div>
                </div>
              ) : null}

              <div className="nexus-chat-actions">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  const disabled = !isAI || isSending || (action.requiresField && !activeAssistantField);
                  return (
                    <button
                      key={action.label}
                      onClick={() => sendMessage(action.prompt)}
                      disabled={disabled}
                      title={action.requiresField && !activeAssistantField ? 'Focus an app field first' : action.label}
                    >
                      <Icon size={13} />
                      {action.label}
                    </button>
                  );
                })}
              </div>

              <div className="nexus-chat-history">
                {chatMessages.length === 0 ? (
                  <div className="nexus-chat-empty">
                    Ask for HL7 help, generate field values, fix a focused payload, or validate the current workflow context.
                  </div>
                ) : (
                  chatMessages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      canApply={!!activeAssistantField && message.status !== 'error'}
                      onApply={applyToActiveField}
                      onCopy={copyText}
                    />
                  ))
                )}
                <div ref={scrollRef} />
              </div>

              <footer className="nexus-chat-composer">
                <div className="flex items-center justify-between pb-2">
                  <span>{isAI ? 'Using settings AI configuration' : 'Switch to AI Engine to send'}</span>
                  <button onClick={clearChatMessages} disabled={chatMessages.length === 0 || isSending} title="Clear assistant session">
                    <Trash2 size={13} />
                    Clear
                  </button>
                </div>
                <div className="nexus-chat-input-row">
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                        event.preventDefault();
                        sendMessage();
                      }
                    }}
                    disabled={!isAI || isSending}
                    placeholder={isAI ? 'Ask Helix Assistant...' : 'Select AI Engine to enable assistant chat'}
                  />
                  <button onClick={() => sendMessage()} disabled={!draft.trim() || isSending || !isAI} title="Send message">
                    {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </div>
              </footer>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
