import React, { useEffect, useState } from 'react';
import TopBar from './components/TopBar.jsx';
import UrlInput from './components/UrlInput.jsx';
import PresetPanel from './components/PresetPanel.jsx';
import LayerPanel from './components/LayerPanel.jsx';
import PropertyPanel from './components/PropertyPanel.jsx';
import EditorCanvas from './components/EditorCanvas.jsx';
import MediaPreview from './components/MediaPreview.jsx';
import ExportMenu from './components/ExportMenu.jsx';
import { listPresets, listTemplates } from './utils/api.js';
import { useEditorStore } from './store/editorStore.js';

export default function App() {
  const [presets, setPresets] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [exportOpen, setExportOpen] = useState(false);
  const source = useEditorStore((s) => s.source);

  const refreshTemplates = () => listTemplates().then(setTemplates).catch(() => {});

  useEffect(() => {
    listPresets().then(setPresets).catch(() => {});
    refreshTemplates();
  }, []);

  return (
    <div className="app-shell">
      <TopBar onExportClick={() => setExportOpen(true)} />
      <div className="app-body">
        <aside className="sidebar sidebar-left">
          <UrlInput />
          <PresetPanel
            presets={presets}
            templates={templates}
            onTemplatesChanged={refreshTemplates}
          />
          {source && <MediaPreview source={source} />}
        </aside>

        <main className="canvas-area">
          <EditorCanvas />
        </main>

        <aside className="sidebar sidebar-right">
          <LayerPanel />
          <PropertyPanel />
        </aside>
      </div>
      {exportOpen && <ExportMenu onClose={() => setExportOpen(false)} />}
    </div>
  );
}
