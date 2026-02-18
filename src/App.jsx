import { useMemo, useRef, useState } from 'react';
import ExplodedPieChart from './components/ExplodedPieChart';

const DEFAULT_CATEGORIES = [
  { id: 1, label: 'Material', value: 58, color: '#8f8cc4' },
  { id: 2, label: 'Labor', value: 23, color: '#a63a7a' },
  { id: 3, label: 'Scrap', value: 9, color: '#efe8b7' },
  { id: 4, label: 'Rework Labor', value: 5, color: '#c9e6ec' },
  { id: 5, label: 'Equipment', value: 5, color: '#5f1f59' }
];
const AUTO_PALETTE = DEFAULT_CATEGORIES.map((item) => item.color);

function freshDefaultCategories() {
  return DEFAULT_CATEGORIES.map((item) => ({ ...item }));
}

function autoPaletteColor(index) {
  return AUTO_PALETTE[index % AUTO_PALETTE.length];
}

function exportSvgToPng(svgElement, { whiteBackground = false, fileName = 'jeeba-chart.png' }) {
  return new Promise((resolve, reject) => {
    if (!svgElement) {
      reject(new Error('Chart is not available.'));
      return;
    }

    const clone = svgElement.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

    const viewBox = svgElement.viewBox.baseVal;
    const width = Math.max(
      1,
      Math.round(viewBox?.width || Number(svgElement.getAttribute('width')) || svgElement.clientWidth || 560)
    );
    const height = Math.max(
      1,
      Math.round(
        viewBox?.height || Number(svgElement.getAttribute('height')) || svgElement.clientHeight || 420
      )
    );

    clone.setAttribute('width', String(width));
    clone.setAttribute('height', String(height));

    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(clone);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(blob);

    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = 2;
      canvas.width = width * scale;
      canvas.height = height * scale;

      const context = canvas.getContext('2d');
      if (!context) {
        URL.revokeObjectURL(svgUrl);
        reject(new Error('Unable to create image context.'));
        return;
      }

      context.scale(scale, scale);
      if (whiteBackground) {
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, width, height);
      }
      context.drawImage(image, 0, 0, width, height);
      URL.revokeObjectURL(svgUrl);

      canvas.toBlob((pngBlob) => {
        if (!pngBlob) {
          reject(new Error('Unable to export PNG.'));
          return;
        }

        const pngUrl = URL.createObjectURL(pngBlob);
        const link = document.createElement('a');
        link.href = pngUrl;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(pngUrl);
        resolve();
      }, 'image/png');
    };

    image.onerror = () => {
      URL.revokeObjectURL(svgUrl);
      reject(new Error('Unable to render SVG.'));
    };

    image.src = svgUrl;
  });
}

function App() {
  const [title, setTitle] = useState('Manufacturing Cost Breakdown');
  const [categories, setCategories] = useState(() => freshDefaultCategories());
  const [strokeColor, setStrokeColor] = useState('#ffffff');
  const [strokeWidth, setStrokeWidth] = useState(5);
  const [explosionDistance, setExplosionDistance] = useState(22);
  const [isExporting, setIsExporting] = useState(false);
  const chartSvgRef = useRef(null);

  const totalInput = useMemo(
    () => categories.reduce((sum, item) => sum + Math.max(0, Number(item.value) || 0), 0),
    [categories]
  );

  const hasData = totalInput > 0;

  const updateCategory = (id, field, value) => {
    setCategories((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        if (field === 'value') {
          const parsed = Number(value);
          return { ...item, value: Number.isFinite(parsed) ? parsed : 0 };
        }

        return { ...item, [field]: value };
      })
    );
  };

  const addCategory = () => {
    const maxId = categories.reduce((max, item) => Math.max(max, item.id), 0);
    setCategories((prev) => [
      ...prev,
      {
        id: maxId + 1,
        label: `Category ${maxId + 1}`,
        value: 10,
        color: autoPaletteColor(prev.length)
      }
    ]);
  };

  const removeCategory = (id) => {
    setCategories((prev) => (prev.length <= 1 ? prev : prev.filter((item) => item.id !== id)));
  };

  const downloadChart = async (whiteBackground) => {
    if (isExporting) return;

    try {
      setIsExporting(true);
      await exportSvgToPng(chartSvgRef.current, {
        whiteBackground,
        fileName: whiteBackground ? 'jeeba-chart-white-background.png' : 'jeeba-chart-transparent.png'
      });
    } catch (error) {
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <main className="app-shell">
      <section className="panel builder-panel">
        <h1>Vastraskogenadiko</h1>
        <p className="creator-line">
          <em>Created by a penguin!</em>
        </p>
        <p className="subhead">
          Enter categories and percentages to generate an exploded pie chart in the same visual style.
        </p>

        <label className="field">
          <span>Chart Title</span>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Enter chart title"
          />
        </label>

        <div className="stroke-grid">
          <div className="field">
            <span>Slice Stroke Color</span>
            <div className="color-cell" aria-label="Slice stroke color">
              <input
                type="color"
                value={strokeColor}
                onChange={(event) => setStrokeColor(event.target.value)}
              />
              <code>{strokeColor.toUpperCase()}</code>
            </div>
          </div>

          <label className="field">
            <span>Slice Stroke Width</span>
            <input
              type="number"
              min="0"
              step="0.5"
              value={strokeWidth}
              onChange={(event) => {
                const parsed = Number(event.target.value);
                setStrokeWidth(Number.isFinite(parsed) ? Math.max(0, parsed) : 0);
              }}
            />
          </label>
        </div>

        <label className="field">
          <span>Slice Explosion: {explosionDistance}px</span>
          <input
            type="range"
            min="0"
            max="80"
            step="1"
            value={explosionDistance}
            onChange={(event) => {
              const parsed = Number(event.target.value);
              setExplosionDistance(Number.isFinite(parsed) ? Math.max(0, parsed) : 0);
            }}
          />
        </label>

        <div className="rows-head">
          <span>Category</span>
          <span>Percent</span>
          <span>Color</span>
          <span></span>
        </div>

        <div className="rows-wrap">
          {categories.map((item) => (
            <div className="row" key={item.id}>
              <input
                type="text"
                value={item.label}
                onChange={(event) => updateCategory(item.id, 'label', event.target.value)}
                aria-label="Category name"
              />
              <input
                type="number"
                min="0"
                step="0.1"
                value={item.value}
                onChange={(event) => updateCategory(item.id, 'value', event.target.value)}
                aria-label="Category percentage"
              />
              <label className="color-cell" aria-label="Category color">
                <input
                  type="color"
                  value={item.color}
                  onChange={(event) => updateCategory(item.id, 'color', event.target.value)}
                />
                <code>{item.color.toUpperCase()}</code>
              </label>
              <button
                className="ghost danger"
                type="button"
                onClick={() => removeCategory(item.id)}
                disabled={categories.length <= 1}
                aria-label="Remove category"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="actions">
          <button type="button" onClick={addCategory}>
            Add Category
          </button>
          <button type="button" className="ghost" onClick={() => setCategories(freshDefaultCategories())}>
            Reset Sample Data
          </button>
        </div>

        <div className="actions download-actions">
          <button
            type="button"
            className="ghost"
            onClick={() => downloadChart(false)}
            disabled={!hasData || isExporting}
          >
            Download PNG
          </button>
          <button
            type="button"
            className="ghost"
            onClick={() => downloadChart(true)}
            disabled={!hasData || isExporting}
          >
            Download PNG (White BG)
          </button>
        </div>

        <p className="note">
          Input total: <strong>{totalInput.toFixed(1)}%</strong>. The chart automatically scales values to a full pie.
        </p>
      </section>

      <section className="panel chart-panel">
        {hasData ? (
          <ExplodedPieChart
            ref={chartSvgRef}
            title={title || 'Untitled Chart'}
            data={categories}
            strokeColor={strokeColor}
            strokeWidth={strokeWidth}
            explosionDistance={explosionDistance}
          />
        ) : (
          <div className="empty">Add at least one positive percentage to render the chart.</div>
        )}
      </section>
    </main>
  );
}

export default App;
