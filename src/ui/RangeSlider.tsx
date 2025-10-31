
import React, { useCallback, useEffect, useRef } from 'react';

interface RangeSliderProps {
  min: number;
  max: number;
  step?: number;
  minValue: number;
  maxValue: number;
  onChange: (values: { min: number; max: number }) => void;
  label?: string;
}

const RangeSlider: React.FC<RangeSliderProps> = ({ min, max, step = 1, minValue, maxValue, onChange, label }) => {
  const minValRef = useRef<HTMLInputElement>(null);
  const maxValRef = useRef<HTMLInputElement>(null);
  const rangeRef = useRef<HTMLDivElement>(null);

  const getPercent = useCallback((value: number) => Math.round(((value - min) / (max - min)) * 100), [min, max]);

  useEffect(() => {
    if (maxValRef.current) {
      const minPercent = getPercent(minValue);
      const maxPercent = getPercent(+maxValRef.current.value);

      if (rangeRef.current) {
        rangeRef.current.style.left = `${minPercent}%`;
        rangeRef.current.style.width = `${maxPercent - minPercent}%`;
      }
    }
  }, [minValue, getPercent]);

  useEffect(() => {
    if (minValRef.current) {
      const minPercent = getPercent(+minValRef.current.value);
      const maxPercent = getPercent(maxValue);

      if (rangeRef.current) {
        rangeRef.current.style.width = `${maxPercent - minPercent}%`;
      }
    }
  }, [maxValue, getPercent]);

  const handleMinChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.min(+event.target.value, maxValue - step);
    onChange({ min: value, max: maxValue });
  };

  const handleMaxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(+event.target.value, minValue + step);
    onChange({ min: minValue, max: value });
  };
  
  const id = React.useId();

  return (
    <div className="w-full">
      {label && <label id={id} className="block text-sm font-medium text-secondary-text dark:text-dark-secondary-text mb-2">{label}</label>}
      <div className="relative h-12 flex items-center" aria-labelledby={id}>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={minValue}
          ref={minValRef}
          onChange={handleMinChange}
          className="thumb thumb--zindex-3"
          aria-label="Minimum value"
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={maxValue}
          ref={maxValRef}
          onChange={handleMaxChange}
          className="thumb thumb--zindex-4"
          aria-label="Maximum value"
        />

        <div className="relative w-full">
          <div className="absolute w-full h-1.5 bg-gray-200 dark:bg-dark-border-color rounded-full z-1" />
          <div ref={rangeRef} className="absolute h-1.5 bg-highlight rounded-full z-2" />
           <div className="absolute text-sm font-medium text-primary-text dark:text-dark-primary-text" style={{ left: `calc(${getPercent(minValue)}% - ${minValue > 9 ? '8px' : '4px'})`, top: '18px' }}>{minValue}</div>
          <div className="absolute text-sm font-medium text-primary-text dark:text-dark-primary-text" style={{ left: `calc(${getPercent(maxValue)}% - ${maxValue > 9 ? '8px' : '4px'})`, top: '18px' }}>{maxValue}</div>
        </div>
      </div>
      <style>{`
        .thumb {
          pointer-events: none;
          position: absolute;
          height: 0;
          width: 100%;
          outline: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          appearance: none;
          background: transparent;
        }

        .thumb::-webkit-slider-thumb {
          -webkit-appearance: none;
          pointer-events: all;
          width: 20px;
          height: 20px;
          background-color: #fff;
          border-radius: 50%;
          border: 3px solid #4f46e5;
          cursor: pointer;
          margin-top: -8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .dark .thumb::-webkit-slider-thumb {
            background-color: #3b82f6;
            border-color: #f1f5f9;
        }

        .thumb--zindex-3 { z-index: 3; }
        .thumb--zindex-4 { z-index: 4; }
      `}</style>
    </div>
  );
};

export default RangeSlider;
