import { useState, useRef, useEffect } from 'react';
import type { Theme } from '../../utils/themeStyles';
import { themeStyles } from '../../utils/themeStyles';
import type { UseTTSReturn } from '../../hooks/useTTS';
import Button from '../Button';
import { Volume2, Pause, Play, Square, Mic, X, Check, ChevronDown } from 'lucide-react';

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
      <Button
        variant="secondary"
        size="sm"
        icon={<Volume2 size={14} />}
        disabled
        title="TTS not supported in your browser"
        style={{ opacity: 0.5 }}
      >
        TTS
      </Button>
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
        <Button
          variant="ghost"
          size="md"
          icon={tts.state === 'playing' ? <Pause size={16} /> : <Play size={16} />}
          onClick={handlePlayPause}
          title={tts.state === 'playing' ? 'Pause' : 'Play'}
          style={{ 
            minWidth: '80px',
            backgroundColor: currentTheme.buttonBg,
            color: currentTheme.text
          }}
        >
          {tts.state === 'playing' ? 'Pause' : 'Play'}
        </Button>

        {/* Stop Button */}
        <Button
          variant="ghost"
          size="md"
          icon={<Square size={16} />}
          onClick={handleStop}
          title="Stop"
          style={{ 
            backgroundColor: currentTheme.buttonBg,
            color: currentTheme.text
          }}
        >
          Stop
        </Button>

        {/* Rate Slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '150px' }}>
          <label style={{ fontSize: '0.8rem', color: currentTheme.text, whiteSpace: 'nowrap' }}>
            Speed:
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
          <Button
            ref={voiceButtonRef}
            variant="ghost"
            size="md"
            icon={<Mic size={16} />}
            onClick={() => setIsVoiceDropdownOpen(!isVoiceDropdownOpen)}
            title="Select voice"
            style={{ 
              whiteSpace: 'nowrap',
              backgroundColor: currentTheme.buttonBg,
              color: currentTheme.text
            }}
          >
            {tts.currentVoice?.name || 'Voice'} <ChevronDown size={14} style={{ marginLeft: '0.25rem' }} />
          </Button>
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
                    No voices available
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
                        <Check size={14} style={{ marginLeft: '0.5rem', color: '#007bff' }} />
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
          <Button
            variant="ghost"
            size="md"
            icon={<X size={16} />}
            onClick={onClose}
            title="Close bar"
            style={{ 
              backgroundColor: currentTheme.buttonBg,
              color: currentTheme.text
            }}
          >
            Close
          </Button>
        )}
      </div>
    );
  }

  if (compact && !isExpanded) {
    return (
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <Button
          variant="ghost"
          size="sm"
          icon={tts.state === 'playing' ? <Pause size={14} /> : tts.state === 'paused' ? <Play size={14} /> : <Volume2 size={14} />}
          onClick={() => {
            if (onToggleFixedBar) {
              onToggleFixedBar();
            } else {
              setIsExpanded(true);
            }
          }}
          title="TTS controls"
          style={{ 
            backgroundColor: currentTheme.buttonBg,
            color: currentTheme.text
          }}
        >
          {tts.state === 'playing' && tts.progress && (
            <span style={{ fontSize: '0.65rem', color: currentTheme.secondaryText }}>
              {Math.round(tts.progress.progress * 100)}%
            </span>
          )}
        </Button>
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
      <Button
        variant="ghost"
        size="sm"
        icon={tts.state === 'playing' ? <Pause size={14} /> : <Play size={14} />}
        onClick={handlePlayPause}
        title={tts.state === 'playing' ? 'Pause' : 'Play'}
        style={{ 
          minWidth: '60px',
          backgroundColor: currentTheme.buttonBg,
          color: currentTheme.text
        }}
      >
        {tts.state === 'playing' ? 'Pause' : 'Play'}
      </Button>

      {/* Stop Button */}
      <Button
        variant="ghost"
        size="sm"
        icon={<Square size={14} />}
        onClick={handleStop}
        title="Stop"
        style={{ 
          backgroundColor: currentTheme.buttonBg,
          color: currentTheme.text
        }}
      >
        Stop
      </Button>

      {/* Rate Slider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', minWidth: '120px' }}>
        <label style={{ fontSize: '0.7rem', color: currentTheme.text, whiteSpace: 'nowrap' }}>
          Speed:
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
        <Button
          ref={voiceButtonRef}
          variant="ghost"
          size="sm"
          icon={<Mic size={14} />}
          onClick={() => setIsVoiceDropdownOpen(!isVoiceDropdownOpen)}
          title="Select voice"
          style={{ 
            whiteSpace: 'nowrap',
            backgroundColor: currentTheme.buttonBg,
            color: currentTheme.text
          }}
        >
          {tts.currentVoice?.name || 'Voice'} <ChevronDown size={12} style={{ marginLeft: '0.25rem' }} />
        </Button>
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
                  No voices available
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
                      <Check size={14} style={{ marginLeft: '0.5rem', color: '#007bff' }} />
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
        <Button
          variant="icon"
          size="sm"
          icon={<X size={12} />}
          onClick={() => setIsExpanded(false)}
          title="Collapse"
          style={{ color: currentTheme.text }}
        />
      )}
    </div>
  );
}


