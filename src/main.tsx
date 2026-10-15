import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./app/App";
import { DataProvider } from "./app/DataContext";
import "./styles/global.css";
import { InstallProvider } from "./app/InstallProvider";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <DataProvider>
        <InstallProvider>
          <App />
        </InstallProvider>
      </DataProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
