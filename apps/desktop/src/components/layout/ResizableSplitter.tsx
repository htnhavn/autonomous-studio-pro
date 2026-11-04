/**
 * @file ResizableSplitter.tsx
 * @description Native-feeling draggable pane divider with hover glow, double-click reset,
 * and high-precision mouse tracking.
 */

import React, { useState, useCallback } from 'react';

export interface ResizableSplitterProps {
  readonly direction: 'horizontal' | 'vertical';
  readonly onResize: (deltaPx: number) => void;
  readonly onReset?: () => void;
  readonly className?: string;
  readonly title?: string;
}

export const ResizableSplitter: React.FC<ResizableSplitterProps> = ({
  direction,
  onResize,
  onReset,
  className = '',
  title = 'Drag to resize pane • Double-click to reset',
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);

      let lastPos = direction === 'horizontal' ? e.clientX : e.clientY;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const currentPos = direction === 'horizontal' ? moveEvent.clientX : moveEvent.clientY;
        const delta = currentPos - lastPos;
        if (delta !== 0) {
          lastPos = currentPos;
          onResize(delta);
        }
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [direction, onResize]
  );

  return (
    <div
      onMouseDown={handleMouseDown}
      onDoubleClick={onReset}
      title={title}
      className={`group relative select-none transition-colors duration-150 z-20 ${
        direction === 'horizontal'
          ? 'w-[7px] -mx-[3px] cursor-col-resize hover:w-[7px]'
          : 'h-[7px] -my-[3px] cursor-row-resize hover:h-[7px]'
      } ${className}`}
    >
      {/* 1px visual hairline that lights up cyan on hover/drag */}
      <div
        className={`absolute inset-0 m-auto pointer-events-none transition-all duration-150 ${
          direction === 'horizontal' ? 'w-[1px] h-full' : 'h-[1px] w-full'
        } ${
          isDragging
            ? 'bg-[#00e5cc] shadow-[0_0_8px_#00e5cc]'
            : 'bg-[#222738] group-hover:bg-[#00e5cc]/80 group-hover:shadow-[0_0_5px_#00e5cc]/40'
        }`}
      />
    </div>
  );
};
