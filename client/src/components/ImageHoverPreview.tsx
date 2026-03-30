import React, { useState } from "react";

interface ImageHoverPreviewProps {
  src: string;
  alt?: string;
  className?: string;
  previewSize?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

const PREVIEW_SIZES = {
  sm: "w-32 h-32",
  md: "w-48 h-48",
  lg: "w-64 h-64",
};

export function ImageHoverPreview({
  src,
  alt = "Preview",
  className = "",
  previewSize = "md",
  children,
}: ImageHoverPreviewProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseEnter = (e: React.MouseEvent) => {
    setIsHovering(true);
    updatePosition(e);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    updatePosition(e);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
  };

  const updatePosition = (e: React.MouseEvent) => {
    const offsetX = 20; // 鼠标右侧偏移
    const offsetY = 20; // 鼠标下方偏移
    setPosition({
      x: e.clientX + offsetX,
      y: e.clientY + offsetY,
    });
  };

  return (
    <>
      <div
        className={className}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </div>

      {isHovering && (
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
          }}
        >
          <div className={`${PREVIEW_SIZES[previewSize]} bg-white border-2 border-gray-300 rounded-lg shadow-2xl overflow-hidden`}>
            <img
              src={src}
              alt={alt}
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
}
