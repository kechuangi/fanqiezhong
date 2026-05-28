const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pomodoro', {
  sendTimerState: (timerState) => ipcRenderer.send('timer-state', timerState),
  notifyFinished: (message) => ipcRenderer.send('notify-finished', message),
  onTrayAction: (callback) => {
    const listener = (_event, action) => callback(action);
    ipcRenderer.on('tray-action', listener);
    return () => ipcRenderer.removeListener('tray-action', listener);
  },
});
