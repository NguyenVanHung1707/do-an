import React, { useState } from 'react';

export default function BarChart({ data, yLabel = '', maxVal = 100, suffix = '' }) {
  const [hoveredBar, setHoveredBar] = useState(null);

  // SVG dimensions
  const width = 500;
  const height = 280;
  const paddingLeft = 50;
  const paddingRight = 20;
  const paddingTop = 30;
  const paddingBottom = 40;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const barCount = data.length;
  const barGap = 20;
  const totalGapsWidth = barGap * (barCount - 1);
  const barWidth = (chartWidth - totalGapsWidth) / barCount;

  // Grid lines
  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto select-none overflow-visible"
      >
        {/* Y Axis Gridlines & Labels */}
        {gridLines.map((ratio, index) => {
          const val = Math.round(ratio * maxVal);
          const y = paddingTop + chartHeight * (1 - ratio);
          return (
            <g key={index} className="opacity-70">
              <line
                x1={paddingLeft}
                y1={y}
                x2={width - paddingRight}
                y2={y}
                stroke="#E2E8F0"
                strokeWidth={1}
                strokeDasharray="4 4"
              />
              <text
                x={paddingLeft - 10}
                y={y + 4}
                textAnchor="end"
                className="text-[10px] font-medium fill-slate-500 font-mono"
              >
                {val}
                {suffix}
              </text>
            </g>
          );
        })}

        {/* Chart Bars */}
        {data.map((item, index) => {
          const ratio = Math.min(item.value / maxVal, 1);
          const barHeight = chartHeight * ratio;
          const x = paddingLeft + index * (barWidth + barGap);
          const y = paddingTop + chartHeight - barHeight;

          const isHovered = hoveredBar === index;

          return (
            <g
              key={index}
              onMouseEnter={() => setHoveredBar(index)}
              onMouseLeave={() => setHoveredBar(null)}
              className="cursor-pointer"
            >
              {/* Bar Column */}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={6}
                fill={isHovered ? '#0056b3' : '#34568B'}
                className="transition-all duration-200"
              />

              {/* Tooltip/Value popup when hovered */}
              {isHovered && (
                <g>
                  <rect
                    x={x + barWidth / 2 - 35}
                    y={y - 25}
                    width={70}
                    height={20}
                    rx={4}
                    fill="#1E293B"
                  />
                  <text
                    x={x + barWidth / 2}
                    y={y - 11}
                    textAnchor="middle"
                    className="text-[10px] font-bold fill-white"
                  >
                    {item.value}
                    {suffix}
                  </text>
                </g>
              )}

              {/* X Axis Label */}
              <text
                x={x + barWidth / 2}
                y={height - paddingBottom + 18}
                textAnchor="middle"
                className="text-[10px] font-bold fill-slate-600"
              >
                {item.label}
              </text>
            </g>
          );
        })}

        {/* X Axis base line */}
        <line
          x1={paddingLeft}
          y1={paddingTop + chartHeight}
          x2={width - paddingRight}
          y2={paddingTop + chartHeight}
          stroke="#94A3B8"
          strokeWidth={1.5}
        />
      </svg>
    </div>
  );
}
