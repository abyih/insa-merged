// import { createRoot } from 'react-dom/client'
// import App from './App.jsx'
// import { DataPipelineProvider } from './pipeline/DataPipelineContext.jsx'

// createRoot(document.getElementById('root')).render(
//   <DataPipelineProvider>
//     <App />
//   </DataPipelineProvider>,
// )
// src/main.jsx




import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { SdnProvider } from './pipeline/SdnContext.jsx';
import { DataPipelineProvider } from './pipeline/DataPipelineContext.jsx';
import { SliceProvider } from './pipeline/SliceContext.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SdnProvider>
      <DataPipelineProvider>
        <SliceProvider>
          <App />
        </SliceProvider>
      </DataPipelineProvider>
    </SdnProvider>
  </React.StrictMode>,
);