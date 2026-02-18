import { forwardRef } from 'react';

const TAU = Math.PI * 2;

function polarPoint(cx, cy, radius, angle) {
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle)
  };
}

function wedgePath(cx, cy, radius, startAngle, endAngle) {
  const start = polarPoint(cx, cy, radius, startAngle);
  const end = polarPoint(cx, cy, radius, endAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;

  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`,
    'Z'
  ].join(' ');
}

function formatPercent(value) {
  if (value >= 10) return `${Math.round(value)}%`;
  return `${value.toFixed(1).replace(/\.0$/, '')}%`;
}

function estimateLegendTextWidth(text) {
  const length = (text || '').length;
  return Math.max(40, length * 8.6);
}

function measureTitleWidth(text, fontSize, fontWeight) {
  if (typeof document === 'undefined') {
    return (text || '').length * fontSize * 0.58;
  }

  if (!measureTitleWidth.canvas) {
    measureTitleWidth.canvas = document.createElement('canvas');
  }

  const context = measureTitleWidth.canvas.getContext('2d');
  if (!context) {
    return (text || '').length * fontSize * 0.58;
  }

  context.font = `${fontWeight} ${fontSize}px 'Trebuchet MS', 'Gill Sans', 'Segoe UI', sans-serif`;
  return context.measureText(text || '').width;
}

function splitTokenByWidth(token, maxWidth, fontSize, fontWeight) {
  const chunks = [];
  let start = 0;

  while (start < token.length) {
    let end = start + 1;
    let lastGood = start;

    while (end <= token.length) {
      const slice = token.slice(start, end);
      if (measureTitleWidth(slice, fontSize, fontWeight) <= maxWidth) {
        lastGood = end;
        end += 1;
      } else {
        break;
      }
    }

    if (lastGood === start) {
      lastGood = Math.min(token.length, start + 1);
    }

    chunks.push(token.slice(start, lastGood));
    start = lastGood;
  }

  return chunks;
}

function wrapTitleLines(rawTitle, maxWidth, fontSize, fontWeight) {
  const title = (rawTitle || '').trim() || 'Untitled Chart';
  const compactTitle = title.replace(/\s+/g, ' ');
  const words = compactTitle.split(' ');
  const lines = [];

  let current = '';
  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;
    if (measureTitleWidth(candidate, fontSize, fontWeight) <= maxWidth) {
      current = candidate;
      return;
    }

    if (current) {
      lines.push(current);
      current = '';
    }

    if (measureTitleWidth(word, fontSize, fontWeight) <= maxWidth) {
      current = word;
      return;
    }

    const chunks = splitTokenByWidth(word, maxWidth, fontSize, fontWeight);
    if (chunks.length > 1) {
      lines.push(...chunks.slice(0, -1));
      current = chunks[chunks.length - 1];
    } else {
      current = chunks[0] || '';
    }
  });

  if (current) lines.push(current);
  return lines.length ? lines : ['Untitled Chart'];
}

function distributeLabelYs(entries, topY, bottomY, minGap) {
  if (!entries.length) return;

  const ordered = [...entries].sort((a, b) => a.y - b.y);
  const effectiveGap =
    ordered.length > 1 ? Math.min(minGap, (bottomY - topY) / (ordered.length - 1)) : 0;

  ordered[0].y = Math.max(topY, ordered[0].y);
  for (let i = 1; i < ordered.length; i += 1) {
    ordered[i].y = Math.max(ordered[i].y, ordered[i - 1].y + effectiveGap);
  }

  ordered[ordered.length - 1].y = Math.min(bottomY, ordered[ordered.length - 1].y);
  for (let i = ordered.length - 2; i >= 0; i -= 1) {
    ordered[i].y = Math.min(ordered[i].y, ordered[i + 1].y - effectiveGap);
  }

  ordered[0].y = Math.max(topY, ordered[0].y);
  for (let i = 1; i < ordered.length; i += 1) {
    ordered[i].y = Math.max(ordered[i].y, ordered[i - 1].y + effectiveGap);
  }
}

const ExplodedPieChart = forwardRef(function ExplodedPieChart(
  { title, data, strokeColor = '#ffffff', strokeWidth = 5, explosionDistance = 22 },
  ref
) {
  const filtered = data
    .map((item) => ({
      ...item,
      value: Math.max(0, Number(item.value) || 0),
      label: item.label?.trim() || 'Untitled'
    }))
    .filter((item) => item.value > 0);

  const total = filtered.reduce((sum, item) => sum + item.value, 0);

  if (!total) {
    return null;
  }

  const width = 620;
  const radius = 118;
  const baseExplosion = Math.max(0, Number(explosionDistance) || 0);
  const maxExplode = baseExplosion * 1.45;
  const titleFontSize = 28;
  const titleFontWeight = 800;
  const titleLineHeight = 34;
  const titleY = 38;
  const titleLines = wrapTitleLines(title, width - 96, titleFontSize, titleFontWeight);
  const extraTitleSpace = Math.max(0, (titleLines.length - 1) * titleLineHeight);
  const titleBottomY = titleY + extraTitleSpace;
  const cx = 300;
  const cy = 230 + extraTitleSpace;
  const legendCenterX = width / 2;
  const legendChipSize = 12;
  const legendGap = 9;
  const legendSpacing = 27;
  const legendStartY = cy + radius + maxExplode + 78;
  const legendHeight = Math.max(24, (filtered.length - 1) * legendSpacing + 24);
  const height = Math.max(560, Math.ceil(legendStartY + legendHeight + 22));
  const labelTopBound = titleBottomY + 22;
  const labelBottomBound = legendStartY - 26;
  const minLabelGap = 20;

  let startAngle = -Math.PI / 2;

  const slices = filtered.map((item) => {
    const fraction = item.value / total;
    const angle = fraction * TAU;
    const endAngle = startAngle + angle;
    const midAngle = startAngle + angle / 2;
    const explode = baseExplosion + (fraction > 0.45 ? baseExplosion * 0.45 : 0);
    const shiftX = Math.cos(midAngle) * explode;
    const shiftY = Math.sin(midAngle) * explode;

    const path = wedgePath(cx + shiftX, cy + shiftY, radius, startAngle, endAngle);
    const labelStart = polarPoint(cx + shiftX, cy + shiftY, radius + 2, midAngle);
    const labelJoint = polarPoint(cx + shiftX, cy + shiftY, radius + 20, midAngle);
    const direction = Math.cos(midAngle) >= 0 ? 1 : -1;
    const labelValue = formatPercent(fraction * 100);

    const currentSlice = {
      ...item,
      fraction,
      path,
      shiftX,
      shiftY,
      labelStart,
      direction,
      labelValue,
      baseLabelY: labelJoint.y,
      baseJointX: labelJoint.x
    };

    startAngle = endAngle;
    return currentSlice;
  });

  const leftEntries = slices
    .filter((slice) => slice.direction < 0)
    .map((slice) => ({ slice, y: slice.baseLabelY }));
  const rightEntries = slices
    .filter((slice) => slice.direction > 0)
    .map((slice) => ({ slice, y: slice.baseLabelY }));

  distributeLabelYs(leftEntries, labelTopBound, labelBottomBound, minLabelGap);
  distributeLabelYs(rightEntries, labelTopBound, labelBottomBound, minLabelGap);

  [...leftEntries, ...rightEntries].forEach(({ slice, y }) => {
    slice.labelJoint = {
      x: slice.baseJointX,
      y
    };
    slice.labelEnd = {
      x: slice.baseJointX + slice.direction * 20,
      y
    };
    slice.labelText = {
      x: slice.labelEnd.x + slice.direction * 8,
      y: y + 2,
      anchor: slice.direction > 0 ? 'start' : 'end',
      value: slice.labelValue
    };
  });

  return (
    <figure className="chart-wrap">
      <svg ref={ref} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
        {titleLines.map((line, index) => (
          <text
            key={`title-line-${index}`}
            x={width / 2}
            y={titleY + index * titleLineHeight}
            textAnchor="middle"
            style={{ fontSize: titleFontSize, fontWeight: titleFontWeight, fill: '#202226' }}
          >
            {line}
          </text>
        ))}

        {slices.map((slice) => (
          <g key={slice.id || slice.label} className="slice-group">
            <path
              className="slice"
              d={slice.path}
              fill={slice.color}
              style={{
                stroke: strokeColor,
                strokeWidth,
                filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.22))'
              }}
            />
            <polyline
              className="label-line"
              points={`${slice.labelStart.x},${slice.labelStart.y} ${slice.labelJoint.x},${slice.labelJoint.y} ${slice.labelEnd.x},${slice.labelEnd.y}`}
              style={{ fill: 'none', stroke: '#2f2f2f', strokeWidth: 1.8, opacity: 0.9 }}
            />
            <text
              className="label-percent"
              x={slice.labelText.x}
              y={slice.labelText.y}
              textAnchor={slice.labelText.anchor}
              style={{ fontSize: 17, fontWeight: 800, letterSpacing: '0.02em', fill: '#151515' }}
            >
              {slice.labelText.value}
            </text>
          </g>
        ))}

        <g className="svg-legend" aria-label="Chart legend">
          {(() => {
            const widestText = slices.reduce(
              (max, slice) => Math.max(max, estimateLegendTextWidth(slice.label)),
              0
            );
            const legendBlockWidth = legendChipSize + legendGap + widestText;
            const legendLeftX = legendCenterX - legendBlockWidth / 2;

            return slices.map((slice, index) => (
              <g
                key={`legend-${slice.id || slice.label}`}
                transform={`translate(${legendLeftX}, ${legendStartY + index * legendSpacing})`}
              >
                <rect
                  className="svg-legend-chip"
                  width={legendChipSize}
                  height={legendChipSize}
                  rx="2"
                  fill={slice.color}
                  style={{ stroke: '#888', strokeWidth: 1 }}
                />
                <text
                  className="svg-legend-text"
                  x={legendChipSize + legendGap}
                  y="11"
                  style={{ fontSize: 16, fontWeight: 600, fill: '#333' }}
                >
                  {slice.label}
                </text>
              </g>
            ));
          })()}
        </g>
      </svg>
    </figure>
  );
});

export default ExplodedPieChart;
