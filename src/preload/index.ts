import { contextBridge, ipcRenderer } from 'electron';

const api = {
  ping: (): Promise<string> => ipcRenderer.invoke('app:ping'),
};

contextBridge.exposeInMainWorld('api', api);

export type Api = typeof api;
