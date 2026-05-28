import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const DEFAULT_SETTINGS = {
  work: 25,
  shortBreak: 5,
  longBreak: 15,
  roundsBeforeLongBreak: 4,
};

const MODES = {
  work: {
    label: '专注时间',
    nextLabel: '休息一下',
    color: '#dc3f3f',
  },
  shortBreak: {
    label: '短休息',
    nextLabel: '回到专注',
    color: '#2f8f5b',
  },
  longBreak: {
    label: '长休息',
    nextLabel: '开启新一轮',
    color: '#2f6f8f',
  },
};

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem('pomodoro-settings') || '{}');
    return { ...DEFAULT_SETTINGS, ...saved };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings) {
  localStorage.setItem('pomodoro-settings', JSON.stringify(settings));
}

function clampMinutes(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return fallback;
  }
  return Math.min(180, Math.max(1, Math.round(number)));
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function getDurationSeconds(mode, settings) {
  if (mode === 'work') {
    return settings.work * 60;
  }
  if (mode === 'shortBreak') {
    return settings.shortBreak * 60;
  }
  return settings.longBreak * 60;
}

function playReminderSound() {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const now = audioContext.currentTime;

  [0, 0.18, 0.36].forEach((offset) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, now + offset);
    gain.gain.setValueAtTime(0.0001, now + offset);
    gain.gain.exponentialRampToValueAtTime(0.25, now + offset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.14);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now + offset);
    oscillator.stop(now + offset + 0.16);
  });
}

function App() {
  const [settings, setSettings] = useState(loadSettings);
  const [draftSettings, setDraftSettings] = useState(loadSettings);
  const [mode, setMode] = useState('work');
  const [remainingSeconds, setRemainingSeconds] = useState(() => DEFAULT_SETTINGS.work * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [completedRounds, setCompletedRounds] = useState(0);
  const [message, setMessage] = useState('准备开始一个专注周期。');
  const intervalRef = useRef(null);

  const modeConfig = MODES[mode];
  const timeText = formatTime(remainingSeconds);
  const progress = useMemo(() => {
    const duration = getDurationSeconds(mode, settings);
    return Math.max(0, Math.min(100, ((duration - remainingSeconds) / duration) * 100));
  }, [mode, remainingSeconds, settings]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    window.pomodoro?.sendTimerState({
      modeLabel: modeConfig.label,
      timeText,
      isRunning,
    });
  }, [modeConfig.label, timeText, isRunning]);

  useEffect(() => {
    if (!isRunning) {
      return undefined;
    }

    intervalRef.current = window.setInterval(() => {
      setRemainingSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => window.clearInterval(intervalRef.current);
  }, [isRunning]);

  useEffect(() => {
    if (!isRunning || remainingSeconds !== 0) {
      return;
    }

    finishCurrentMode(true);
  }, [remainingSeconds, isRunning]);

  useEffect(() => {
    return window.pomodoro?.onTrayAction((action) => {
      if (action === 'toggle') {
        setIsRunning((running) => !running);
      }
      if (action === 'reset') {
        resetTimer();
      }
    });
  }, [mode, settings]);

  function switchMode(nextMode, startRunning = false) {
    setMode(nextMode);
    setRemainingSeconds(getDurationSeconds(nextMode, settings));
    setIsRunning(startRunning);
  }

  function finishCurrentMode(showReminder) {
    setIsRunning(false);

    if (showReminder) {
      playReminderSound();
    }

    if (mode === 'work') {
      const nextCompletedRounds = completedRounds + 1;
      const nextMode = nextCompletedRounds % settings.roundsBeforeLongBreak === 0 ? 'longBreak' : 'shortBreak';
      setCompletedRounds(nextCompletedRounds);
      setMessage(nextMode === 'longBreak' ? '专注完成，进入长休息。' : '专注完成，短暂休息一下。');
      if (showReminder) {
        window.pomodoro?.notifyFinished(nextMode === 'longBreak' ? '专注结束，进入长休息。' : '专注结束，短暂休息一下。');
      }
      switchMode(nextMode);
      return;
    }

    setMessage('休息结束，开始新的专注吧。');
    if (showReminder) {
      window.pomodoro?.notifyFinished('休息结束，开始新的专注吧。');
    }
    switchMode('work');
  }

  function resetTimer() {
    setIsRunning(false);
    setMode('work');
    setCompletedRounds(0);
    setRemainingSeconds(getDurationSeconds('work', settings));
    setMessage('已重置，准备开始一个专注周期。');
  }

  function skipTimer() {
    finishCurrentMode(false);
  }

  function applySettings(event) {
    event.preventDefault();
    const nextSettings = {
      work: clampMinutes(draftSettings.work, settings.work),
      shortBreak: clampMinutes(draftSettings.shortBreak, settings.shortBreak),
      longBreak: clampMinutes(draftSettings.longBreak, settings.longBreak),
      roundsBeforeLongBreak: Math.min(12, Math.max(2, Math.round(Number(draftSettings.roundsBeforeLongBreak) || settings.roundsBeforeLongBreak))),
    };

    setSettings(nextSettings);
    setDraftSettings(nextSettings);
    setIsRunning(false);
    setRemainingSeconds(getDurationSeconds(mode, nextSettings));
    setMessage('设置已保存。');
  }

  function updateDraft(key, value) {
    setDraftSettings((current) => ({ ...current, [key]: value }));
  }

  return (
    <main className="app" style={{ '--accent': modeConfig.color }}>
      <section className="timer-card">
        <div className="mode-pill">{modeConfig.label}</div>
        <h1>番茄钟</h1>
        <div className="time" aria-live="polite">{timeText}</div>
        <div className="progress" aria-hidden="true">
          <div className="progress-bar" style={{ width: `${progress}%` }} />
        </div>
        <p className="message">{message}</p>
        <p className="rounds">已完成 {completedRounds % settings.roundsBeforeLongBreak} / {settings.roundsBeforeLongBreak} 个专注周期</p>

        <div className="controls">
          <button className="primary" onClick={() => setIsRunning((running) => !running)}>
            {isRunning ? '暂停' : remainingSeconds === getDurationSeconds(mode, settings) ? '开始' : '继续'}
          </button>
          <button onClick={resetTimer}>重置</button>
          <button onClick={skipTimer}>跳过</button>
        </div>
      </section>

      <section className="settings-card">
        <h2>自定义时长</h2>
        <form onSubmit={applySettings}>
          <label>
            专注分钟
            <input type="number" min="1" max="180" value={draftSettings.work} onChange={(event) => updateDraft('work', event.target.value)} />
          </label>
          <label>
            短休分钟
            <input type="number" min="1" max="180" value={draftSettings.shortBreak} onChange={(event) => updateDraft('shortBreak', event.target.value)} />
          </label>
          <label>
            长休分钟
            <input type="number" min="1" max="180" value={draftSettings.longBreak} onChange={(event) => updateDraft('longBreak', event.target.value)} />
          </label>
          <label>
            长休间隔
            <input type="number" min="2" max="12" value={draftSettings.roundsBeforeLongBreak} onChange={(event) => updateDraft('roundsBeforeLongBreak', event.target.value)} />
          </label>
          <button className="save" type="submit">保存设置</button>
        </form>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
