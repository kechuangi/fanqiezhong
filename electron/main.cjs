const { app, BrowserWindow, Menu, Tray, ipcMain, nativeImage } = require('electron');
const path = require('path');

let mainWindow;
let tray;
let latestTimerState = {
  modeLabel: '专注时间',
  timeText: '25:00',
  isRunning: false,
};

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);

function createTrayIcon() {
  const size = 16;
  const buffer = Buffer.alloc(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const isBorder = x < 2 || x > 13 || y < 2 || y > 13;
      buffer[index] = isBorder ? 120 : 220;
      buffer[index + 1] = isBorder ? 64 : 63;
      buffer[index + 2] = isBorder ? 54 : 63;
      buffer[index + 3] = 255;
    }
  }

  return nativeImage.createFromBitmap(buffer, { width: size, height: size });
}

function updateTrayMenu() {
  if (!tray) {
    return;
  }

  tray.setToolTip(`番茄钟 - ${latestTimerState.modeLabel} ${latestTimerState.timeText}`);
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: `${latestTimerState.modeLabel} ${latestTimerState.timeText}`,
        enabled: false,
      },
      {
        label: latestTimerState.isRunning ? '暂停' : '开始',
        click: () => mainWindow?.webContents.send('tray-action', 'toggle'),
      },
      {
        label: '重置',
        click: () => mainWindow?.webContents.send('tray-action', 'reset'),
      },
      { type: 'separator' },
      {
        label: '显示窗口',
        click: showMainWindow,
      },
      {
        label: '退出',
        click: () => {
          app.isQuitting = true;
          app.quit();
        },
      },
    ]),
  );
}

function createTray() {
  tray = new Tray(createTrayIcon());
  tray.on('double-click', showMainWindow);
  updateTrayMenu();
}

function showMainWindow() {
  if (!mainWindow) {
    return;
  }

  mainWindow.show();
  mainWindow.focus();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 460,
    height: 640,
    minWidth: 420,
    minHeight: 560,
    title: '番茄钟',
    backgroundColor: '#f7f2ef',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      showMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (app.isQuitting) {
    app.quit();
  }
});

ipcMain.on('timer-state', (_event, timerState) => {
  latestTimerState = timerState;
  updateTrayMenu();
});

ipcMain.on('notify-finished', (_event, message) => {
  if (mainWindow && !mainWindow.isVisible()) {
    mainWindow.flashFrame(true);
  }
  tray?.displayBalloon({
    title: '番茄钟',
    content: message,
  });
});
