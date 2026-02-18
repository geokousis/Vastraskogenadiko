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
  const cx = 300;
  const cy = 230;
  const radius = 118;
  const baseExplosion = Math.max(0, Number(explosionDistance) || 0);
  const maxExplode = baseExplosion * 1.45;
  const legendCenterX = width / 2;
  const legendChipSize = 12;
  const legendGap = 9;
  const legendSpacing = 27;
  const titleY = 38;
  const legendStartY = cy + radius + maxExplode + 78;
  const legendHeight = Math.max(24, (filtered.length - 1) * legendSpacing + 24);
  const height = Math.max(560, Math.ceil(legendStartY + legendHeight + 22));

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
    const labelEnd = {
      x: labelJoint.x + direction * 20,
      y: labelJoint.y
    };

    const labelText = {
      x: labelEnd.x + direction * 8,
      y: labelEnd.y + 2,
      anchor: direction > 0 ? 'start' : 'end',
      value: formatPercent(fraction * 100)
    };

    const currentSlice = {
      ...item,
      fraction,
      path,
      shiftX,
      shiftY,
      labelStart,
      labelJoint,
      labelEnd,
      labelText
    };

    startAngle = endAngle;
    return currentSlice;
  });

  return (
    <figure className="chart-wrap">
      <svg ref={ref} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
        <text x={width / 2} y={titleY} textAnchor="middle" style={{ fontSize: 28, fontWeight: 800, fill: '#202226' }}>
          {title}
        </text>

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
