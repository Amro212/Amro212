import { useEffect, useState } from 'react';
import { getMusicVolume, initAudio, isMusicPlaying, pressSound, setMusicAutoplay, setMusicVolume, stopMusic, toggleMusic } from '../audio';

function PlayIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5.5v13a1 1 0 0 0 1.53.85l10.2-6.5a1 1 0 0 0 0-1.7L9.53 4.65A1 1 0 0 0 8 5.5Z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}

/**
 * Small music player, built from the same pill recipe as the contact
 * button (dark gradient fill, conic border ring, copper shadow) and
 * sitting opposite it in the top-right corner. Plays the Aruarian Dance
 * loop: quiet, low-passed so it sounds muffled and distant, fading in
 * over 2.5s and looping gapless. The play button uses the same press
 * sound as the contact rows.
 */
export default function MusicPlayer() {
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.15);
  const [pressed, setPressed] = useState(false);

  // On by default: the pill shows playing and the loop is armed, so
  // the first tap, click, or keypress anywhere fades it in. Browsers
  // block sound before any gesture, so it cannot play before that.
  useEffect(() => {
    setPlaying(true);
    setVolume(getMusicVolume());
    setMusicAutoplay(true);
  }, []);

  const onToggle = async () => {
    initAudio();
    if (isMusicPlaying()) {
      // Actually playing: pause it and disarm so a later gesture does
      // not start it again.
      stopMusic();
      setMusicAutoplay(false);
      setPlaying(false);
    } else if (playing) {
      // Armed but never started (no gesture yet): the user is turning
      // it off before it ever played. Disarm only, do not start it.
      setMusicAutoplay(false);
      setPlaying(false);
    } else {
      const next = await toggleMusic();
      setPlaying(next);
    }
  };

  const onVolume = (v: number) => {
    setVolume(v);
    setMusicVolume(v);
  };

  return (
    <div className="music-player" data-playing={playing ? '' : undefined}>
      <div className="music-pill" data-down={pressed ? '' : undefined}>
        <button
          type="button"
          className="music-toggle"
          aria-label={playing ? 'Pause music' : 'Play music'}
          aria-pressed={playing}
          onPointerDown={() => { initAudio(); pressSound(true); setPressed(true); }}
          onPointerUp={() => setPressed(false)}
          onPointerLeave={() => setPressed(false)}
          onClick={() => void onToggle()}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>
        <span className="music-eq" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="music-title">aruarian dance — nujabes</span>
        <input
          type="range"
          className="music-vol"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          aria-label="Music volume"
          onChange={(e) => onVolume(Number(e.target.value))}
        />
      </div>
    </div>
  );
}
