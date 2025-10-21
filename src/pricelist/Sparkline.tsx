import React from 'react';

interface SparklineProps {
    data: number[];
}

const Sparkline: React.FC<SparklineProps> = ({ data }) => {
  if (!data || data.length < 2) {
    return <div className="h-8 w-24 flex items-center justify-center text-xs text-secondary-text">-</div>;
  }
  
  const width = 100;
  const height = 32;
  const maxVal = Math.max(...data, 0);
  const minVal = Math.min(...data, 0);
  const range = maxVal - minVal;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - (range === 0 ? height / 2 : ((d - minVal) / range) * (height - 4)) - 2; // -4 and -2 for padding
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');
  
  const pathD = `M ${points}`;
  const areaPathD = `${pathD} L ${width},${height} L 0,${height} Z`;
  const lastSale = data[data.length - 1];

  return (
    <div className="w-24 h-8" title={`Last 90 days sales trend. Most recent week: ${lastSale} units.`}>
      <svg viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        <defs>
          <linearGradient id="sparkline-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.2"/>
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0"/>
          </linearGradient>
        </defs>
        <path d={areaPathD} fill="url(#sparkline-gradient)" />
        <path d={pathD} fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
};

export default Sparkline;