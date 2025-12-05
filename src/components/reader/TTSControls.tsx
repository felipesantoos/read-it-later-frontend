import { useState, useRef, useEffect } from 'react';
import type { Theme } from '../../utils/themeStyles';
import { themeStyles } from '../../utils/themeStyles';
import type { UseTTSReturn } from '../../hooks/useTTS';

interface TTSControlsProps {
  tts: UseTTSReturn;
  theme: Theme;
  compact?: boolean;
  fixedBar?: boolean;
  onClose?: () => void;
  onToggleFixedBar?: () => void;
}

export default function TTSControls({ tts, theme, compact = true, fixedBar = false, onClose, onToggleFixedBar }: TTSControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVoiceDropdownOpen, setIsVoiceDropdownOpen] = useState(false);
  const voiceDropdownRef = useRef<HTMLDivElement>(null);
  const voiceButtonRef = useRef<HTMLButtonElement>(null);
  const currentTheme = themeStyles[theme];

  // Close voice dropdown when clicking outside
  useEffect(() => {
    if (!isVoiceDropdownOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        voiceDropdownRef.current &&
        !voiceDropdownRef.current.contains(event.target as Node) &&
        voiceButtonRef.current &&
        !voiceButtonRef.current.contains(event.target as Node)
      ) {
        setIsVoiceDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isVoiceDropdownOpen]);

  if (!tts.isSupported) {
    return (
      <button
        disabled
        title="TTS não suportado no seu navegador"
        style={{
          padding: '0.25rem 0.5rem',
          fontSize: '0.75rem',
          backgroundColor: currentTheme.buttonBg,
          color: currentTheme.secondaryText,
          border: 'none',
          borderRadius: '3px',
          cursor: 'not-allowed',
          opacity: 0.5,
        }}
      >
        🔊 TTS
      </button>
    );
  }

  const handlePlayPause = () => {
    if (tts.state === 'playing') {
      tts.pause();
    } else {
      tts.play();
    }
  };

  const handleStop = () => {
    tts.stop();
    setIsExpanded(false);
  };

  // Render fixed bar at bottom
  if (fixedBar) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          width: '100%',
          backgroundColor: currentTheme.cardBg,
          borderTop: `1px solid ${currentTheme.cardBorder}`,
          padding: '0.75rem 1rem',
          zIndex: 1000,
          boxShadow: '0 -2px 8px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        {/* Play/Pause Button */}
        <button
          onClick={handlePlayPause}
          title={tts.state === 'playing' ? 'Pausar' : 'Reproduzir'}
          style={{
            padding: '0.5rem 1rem',
            fontSize: '0.875rem',
            backgroundColor: currentTheme.buttonBg,
            color: currentTheme.text,
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            minWidth: '80px',
          }}
        >
          {tts.state === 'playing' ? '⏸️ Pausar' : '▶️ Reproduzir'}
        </button>

        {/* Stop Button */}
        <button
          onClick={handleStop}
          title="Parar"
          style={{
            padding: '0.5rem 1rem',
            fontSize: '0.875rem',
            backgroundColor: currentTheme.buttonBg,
            color: currentTheme.text,
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          ⏹️ Parar
        </button>

        {/* Rate Slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '150px' }}>
          <label style={{ fontSize: '0.8rem', color: currentTheme.text, whiteSpace: 'nowrap' }}>
            Velocidade:
          </label>
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.1"
            value={tts.rate}
            onChange={(e) => tts.setRate(parseFloat(e.target.value))}
            style={{
              flex: 1,
              cursor: 'pointer',
            }}
          />
          <span style={{ fontSize: '0.8rem', color: currentTheme.secondaryText, minWidth: '40px' }}>
            {tts.rate.toFixed(1)}x
          </span>
        </div>

        {/* Voice Selector */}
        <div style={{ position: 'relative' }}>
          <button
            ref={voiceButtonRef}
            onClick={() => setIsVoiceDropdownOpen(!isVoiceDropdownOpen)}
            title="Selecionar voz"
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              backgroundColor: currentTheme.buttonBg,
              color: currentTheme.text,
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            🎤 {tts.currentVoice?.name || 'Voz'} ▼
          </button>
          {isVoiceDropdownOpen && (
            <>
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 9999,
                  pointerEvents: 'none',
                }}
              />
              <div
                ref={voiceDropdownRef}
                style={{
                  position: 'fixed',
                  bottom: voiceButtonRef.current
                    ? `${window.innerHeight - voiceButtonRef.current.getBoundingClientRect().top + 4}px`
                    : '80px',
                  left: voiceButtonRef.current
                    ? `${Math.max(0, Math.min(voiceButtonRef.current.getBoundingClientRect().left, window.innerWidth - 320))}px`
                    : '0',
                  backgroundColor: currentTheme.cardBg,
                  border: `1px solid ${currentTheme.cardBorder}`,
                  borderRadius: '4px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  zIndex: 10001,
                  maxHeight: '200px',
                  overflowY: 'auto',
                  minWidth: '200px',
                  maxWidth: '300px',
                  pointerEvents: 'auto',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {tts.voices.length === 0 ? (
                  <div style={{ padding: '0.5rem', fontSize: '0.75rem', color: currentTheme.secondaryText }}>
                    Nenhuma voz disponível
                  </div>
                ) : (
                  tts.voices.map((voice) => (
                    <div
                      key={voice.voiceURI}
                      onClick={() => {
                        tts.setVoice(voice);
                        setIsVoiceDropdownOpen(false);
                      }}
                      style={{
                        padding: '0.5rem 0.75rem',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        backgroundColor:
                          tts.currentVoice?.voiceURI === voice.voiceURI
                            ? currentTheme.buttonBg
                            : currentTheme.cardBg,
                        color: currentTheme.text,
                        transition: 'background-color 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        if (tts.currentVoice?.voiceURI !== voice.voiceURI) {
                          (e.currentTarget as HTMLElement).style.backgroundColor = currentTheme.buttonBg;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (tts.currentVoice?.voiceURI !== voice.voiceURI) {
                          (e.currentTarget as HTMLElement).style.backgroundColor = currentTheme.cardBg;
                        }
                      }}
                    >
                      {voice.name}
                      {voice.lang && (
                        <span style={{ fontSize: '0.65rem', color: currentTheme.secondaryText, marginLeft: '0.5rem' }}>
                          ({voice.lang})
                        </span>
                      )}
                      {tts.currentVoice?.voiceURI === voice.voiceURI && (
                        <span style={{ marginLeft: '0.5rem', color: '#007bff' }}>✓</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* Progress Indicator */}
        {tts.progress && (
          <div style={{ fontSize: '0.8rem', color: currentTheme.secondaryText, whiteSpace: 'nowrap' }}>
            {tts.progress.currentIndex + 1}/{tts.progress.totalChunks}
          </div>
        )}

        {/* Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            title="Fechar barra"
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              backgroundColor: currentTheme.buttonBg,
              color: currentTheme.text,
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            ✕ Fechar
          </button>
        )}
      </div>
    );
  }

  if (compact && !isExpanded) {
    return (
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <button
          onClick={() => {
            if (onToggleFixedBar) {
              onToggleFixedBar();
            } else {
              setIsExpanded(true);
            }
          }}
          title="Controles de TTS"
          style={{
            padding: '0.25rem 0.5rem',
            fontSize: '0.75rem',
            backgroundColor: currentTheme.buttonBg,
            color: currentTheme.text,
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
          }}
        >
          {tts.state === 'playing' ? '⏸️' : tts.state === 'paused' ? '▶️' : '🔊'}
          {tts.state === 'playing' && tts.progress && (
            <span style={{ fontSize: '0.65rem', color: currentTheme.secondaryText }}>
              {Math.round(tts.progress.progress * 100)}%
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.25rem',
        backgroundColor: currentTheme.cardBg,
        border: `1px solid ${currentTheme.cardBorder}`,
        borderRadius: '4px',
        flexWrap: 'wrap',
      }}
    >
      {/* Play/Pause Button */}
      <button
        onClick={handlePlayPause}
        title={tts.state === 'playing' ? 'Pausar' : 'Reproduzir'}
        style={{
          padding: '0.25rem 0.5rem',
          fontSize: '0.75rem',
          backgroundColor: currentTheme.buttonBg,
          color: currentTheme.text,
          border: 'none',
          borderRadius: '3px',
          cursor: 'pointer',
          minWidth: '60px',
        }}
      >
        {tts.state === 'playing' ? '⏸️ Pausar' : '▶️ Reproduzir'}
      </button>

      {/* Stop Button */}
      <button
        onClick={handleStop}
        title="Parar"
        style={{
          padding: '0.25rem 0.5rem',
          fontSize: '0.75rem',
          backgroundColor: currentTheme.buttonBg,
          color: currentTheme.text,
          border: 'none',
          borderRadius: '3px',
          cursor: 'pointer',
        }}
      >
        ⏹️ Parar
      </button>

      {/* Rate Slider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', minWidth: '120px' }}>
        <label style={{ fontSize: '0.7rem', color: currentTheme.text, whiteSpace: 'nowrap' }}>
          Velocidade:
        </label>
        <input
          type="range"
          min="0.5"
          max="2.0"
          step="0.1"
          value={tts.rate}
          onChange={(e) => tts.setRate(parseFloat(e.target.value))}
          style={{
            flex: 1,
            cursor: 'pointer',
          }}
        />
        <span style={{ fontSize: '0.7rem', color: currentTheme.secondaryText, minWidth: '35px' }}>
          {tts.rate.toFixed(1)}x
        </span>
      </div>

      {/* Voice Selector */}
      <div style={{ position: 'relative' }}>
        <button
          ref={voiceButtonRef}
          onClick={() => setIsVoiceDropdownOpen(!isVoiceDropdownOpen)}
          title="Selecionar voz"
          style={{
            padding: '0.25rem 0.5rem',
            fontSize: '0.75rem',
            backgroundColor: currentTheme.buttonBg,
            color: currentTheme.text,
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          🎤 {tts.currentVoice?.name || 'Voz'} ▼
        </button>
        {isVoiceDropdownOpen && (
          <>
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 9999,
                pointerEvents: 'none',
              }}
            />
            <div
              ref={voiceDropdownRef}
              style={{
                position: 'fixed',
                top: voiceButtonRef.current
                  ? `${voiceButtonRef.current.getBoundingClientRect().bottom + 4}px`
                  : '0',
                left: voiceButtonRef.current
                  ? `${voiceButtonRef.current.getBoundingClientRect().left}px`
                  : '0',
                backgroundColor: currentTheme.cardBg,
                border: `1px solid ${currentTheme.cardBorder}`,
                borderRadius: '4px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                zIndex: 10000,
                maxHeight: '200px',
                overflowY: 'auto',
                minWidth: '200px',
                maxWidth: '300px',
                pointerEvents: 'auto',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {tts.voices.length === 0 ? (
                <div style={{ padding: '0.5rem', fontSize: '0.75rem', color: currentTheme.secondaryText }}>
                  Nenhuma voz disponível
                </div>
              ) : (
                tts.voices.map((voice) => (
                  <div
                    key={voice.voiceURI}
                    onClick={() => {
                      tts.setVoice(voice);
                      setIsVoiceDropdownOpen(false);
                    }}
                    style={{
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      backgroundColor:
                        tts.currentVoice?.voiceURI === voice.voiceURI
                          ? currentTheme.buttonBg
                          : currentTheme.cardBg,
                      color: currentTheme.text,
                      transition: 'background-color 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      if (tts.currentVoice?.voiceURI !== voice.voiceURI) {
                        (e.currentTarget as HTMLElement).style.backgroundColor = currentTheme.buttonBg;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (tts.currentVoice?.voiceURI !== voice.voiceURI) {
                        (e.currentTarget as HTMLElement).style.backgroundColor = currentTheme.cardBg;
                      }
                    }}
                  >
                    {voice.name}
                    {voice.lang && (
                      <span style={{ fontSize: '0.65rem', color: currentTheme.secondaryText, marginLeft: '0.5rem' }}>
                        ({voice.lang})
                      </span>
                    )}
                    {tts.currentVoice?.voiceURI === voice.voiceURI && (
                      <span style={{ marginLeft: '0.5rem', color: '#007bff' }}>✓</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Progress Indicator */}
      {tts.progress && (
        <div style={{ fontSize: '0.7rem', color: currentTheme.secondaryText, whiteSpace: 'nowrap' }}>
          {tts.progress.currentIndex + 1}/{tts.progress.totalChunks}
        </div>
      )}

      {/* Collapse Button (only in compact mode) */}
      {compact && (
        <button
          onClick={() => setIsExpanded(false)}
          title="Recolher"
          style={{
            padding: '0.15rem 0.3rem',
            fontSize: '0.7rem',
            backgroundColor: currentTheme.buttonBg,
            color: currentTheme.text,
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer',
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}


