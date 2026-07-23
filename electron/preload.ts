import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('lumiAPI', {
  pickFolder: () => ipcRenderer.invoke('lumi:pickFolder'),
  scanFolder: (uri: string) => ipcRenderer.invoke('lumi:scanFolder', { uri }),
  verifyFolderAccess: (uri: string) => ipcRenderer.invoke('lumi:verifyFolderAccess', { uri }),
  getArtwork: (uri: string) => ipcRenderer.invoke('lumi:getArtwork', { uri }),
  listDefaultArt: () => ipcRenderer.invoke('lumi:listDefaultArt'),
  storeGet: (key: string) => ipcRenderer.invoke('lumi:storeGet', key),
  storeSet: (key: string, value: string) => ipcRenderer.invoke('lumi:storeSet', key, value),
  storeRemove: (key: string) => ipcRenderer.invoke('lumi:storeRemove', key),
});
