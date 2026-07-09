const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nacsa', {
  pickFolder:          () => ipcRenderer.invoke('pick-folder'),
  verifyFolderAccess: (p) => ipcRenderer.invoke('verify-folder-access', p),
  scanFolder:          (p) => ipcRenderer.invoke('scan-folder', p),

  store: {
    getPlaylists:  ()        => ipcRenderer.invoke('store-get-playlists'),
    savePlaylist:  (pl)      => ipcRenderer.invoke('store-save-playlist', pl),
    deletePlaylist:(id)      => ipcRenderer.invoke('store-delete-playlist', id),
    getSongs:      (id)      => ipcRenderer.invoke('store-get-songs', id),
    saveSongs:     (id, s)   => ipcRenderer.invoke('store-save-songs', id, s),
  },

  // [2] Taskbar thumbnail toolbar — renderer tells main the current state;
  //     main sends back 'thumbar-cmd' when a toolbar button is clicked.
  thumbar: {
    update: (state) => ipcRenderer.send('thumbar-update', state),
    onCommand: (cb) => {
      ipcRenderer.on('thumbar-cmd', (_e, cmd) => cb(cmd));
    },
  },

  // [3] Persistent playback state — restores last song/queue/position on relaunch
  playback: {
    save: (state) => ipcRenderer.invoke('save-playback-state', state),
    load: () => ipcRenderer.invoke('load-playback-state'),
  },
});
