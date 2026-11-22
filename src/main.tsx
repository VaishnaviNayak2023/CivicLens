import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource/manrope/400.css';
import '@fontsource/manrope/500.css';
import '@fontsource/manrope/600.css';
import '@fontsource/manrope/700.css';
import '@fontsource/manrope/800.css';
import '@fontsource/caveat/600.css';
import { CivicProvider } from './web/store';
import { App } from './web/App';
import './web/styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <CivicProvider>
        <App />
      </CivicProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
