import { create } from 'zustand';

let layerSeq = 1;
const newId = (prefix = 'layer') => `${prefix}-${Date.now().toString(36)}-${layerSeq++}`;

const DEFAULT_DOC = {
  background: '#0f172a',
  layers: [],
};
const DEFAULT_SIZE = { width: 1080, height: 1080 };

export const useEditorStore = create((set, get) => ({
  // canvas
  size: DEFAULT_SIZE,
  doc: DEFAULT_DOC,
  selectedId: null,
  // source media (Instagram or manual upload)
  source: null, // { mediaType, filename, publicUrl, sourceUrl }
  analysis: null, // { palette, layout, textRegions }
  // tier
  watermarkEnabled: true,

  setSize: (size) => set({ size }),

  setDoc: (doc) => set({ doc, selectedId: null }),

  loadPreset: (preset) =>
    set({
      size: preset.size || DEFAULT_SIZE,
      doc: JSON.parse(JSON.stringify(preset.doc)),
      selectedId: null,
    }),

  setSource: (source) => set({ source, analysis: null }),

  setAnalysis: (analysis) => set({ analysis }),

  setWatermarkEnabled: (b) => set({ watermarkEnabled: !!b }),

  select: (id) => set({ selectedId: id }),

  addLayer: (layer) =>
    set((s) => {
      const id = layer.id || newId(layer.type);
      return {
        doc: { ...s.doc, layers: [...s.doc.layers, { ...layer, id }] },
        selectedId: id,
      };
    }),

  updateLayer: (id, patch) =>
    set((s) => ({
      doc: {
        ...s.doc,
        layers: s.doc.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)),
      },
    })),

  removeLayer: (id) =>
    set((s) => ({
      doc: { ...s.doc, layers: s.doc.layers.filter((l) => l.id !== id) },
      selectedId: s.selectedId === id ? null : s.selectedId,
    })),

  reorderLayer: (id, direction) =>
    set((s) => {
      const layers = [...s.doc.layers];
      const idx = layers.findIndex((l) => l.id === id);
      if (idx === -1) return {};
      const swap = direction === 'up' ? idx + 1 : idx - 1;
      if (swap < 0 || swap >= layers.length) return {};
      [layers[idx], layers[swap]] = [layers[swap], layers[idx]];
      return { doc: { ...s.doc, layers } };
    }),

  toggleLock: (id) =>
    set((s) => ({
      doc: {
        ...s.doc,
        layers: s.doc.layers.map((l) =>
          l.id === id ? { ...l, locked: !l.locked } : l
        ),
      },
    })),

  toggleVisible: (id) =>
    set((s) => ({
      doc: {
        ...s.doc,
        layers: s.doc.layers.map((l) =>
          l.id === id ? { ...l, hidden: !l.hidden } : l
        ),
      },
    })),

  setBackground: (color) =>
    set((s) => ({ doc: { ...s.doc, background: color } })),

  /**
   * Build a starter doc from analysis output. Uses the dominant palette as
   * background + accent, plus a heading + subtitle in approximate text-region
   * positions. Style-inspired only — not a copy.
   */
  seedFromAnalysis: (analysis, mediaUrl, mediaType) => {
    if (!analysis) return;
    const palette = analysis.palette || [];
    const bg = palette[0]?.hex || '#111827';
    const accent = palette[1]?.hex || '#f43f5e';
    const text = palette[2]?.hex || '#ffffff';

    const layers = [];
    if (mediaUrl) {
      layers.push({
        id: newId(mediaType === 'video' ? 'video' : 'media'),
        type: mediaType === 'video' ? 'video' : 'image',
        x: 0,
        y: 0,
        width: get().size.width,
        height: get().size.height,
        src: mediaUrl,
        opacity: 0.45,
        filters: { brightness: 1, contrast: 1, blur: 0 },
        rotation: 0,
      });
    }

    const regions = (analysis.textRegions || []).slice(0, 2);
    const w = get().size.width;
    const h = get().size.height;

    const titleRegion = regions[0] || { yPercent: 0.65, heightPercent: 0.12 };
    layers.push({
      id: newId('title'),
      type: 'rect',
      x: 0,
      y: Math.round(titleRegion.yPercent * h) - 10,
      width: w,
      height: Math.round(titleRegion.heightPercent * h) + 60,
      fill: accent,
      opacity: 0.9,
      rotation: 0,
    });
    layers.push({
      id: newId('title-text'),
      type: 'text',
      x: 60,
      y: Math.round(titleRegion.yPercent * h) + 10,
      text: 'Edit your headline',
      fontSize: Math.round(h * 0.06),
      fontFamily: 'Inter',
      fontStyle: 'bold',
      fill: text,
      width: w - 120,
    });

    if (regions[1]) {
      layers.push({
        id: newId('sub-text'),
        type: 'text',
        x: 60,
        y: Math.round(regions[1].yPercent * h) + 20,
        text: 'Style-inspired template — not a copy.',
        fontSize: Math.round(h * 0.028),
        fontFamily: 'Inter',
        fill: text,
        width: w - 120,
      });
    }

    set({
      doc: { background: bg, layers },
      selectedId: null,
    });
  },
}));
