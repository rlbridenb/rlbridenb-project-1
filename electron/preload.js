const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  getToken: () => ipcRenderer.invoke("auth:getToken"),
  getPlanes: (token, latitude, longitude) =>
    ipcRenderer.invoke("planes:get", token, latitude, longitude),
  getFlightInfo: (callSign) => ipcRenderer.invoke("planes:getInfo", callSign),
  getCoordinates: (number, street, city, zipCode) =>
    ipcRenderer.invoke(
      "location:getCoordinates",
      number,
      street,
      city,
      zipCode,
    ),
  toggleFullscreen: () => ipcRenderer.send("toggle-fullscreen"),
});
