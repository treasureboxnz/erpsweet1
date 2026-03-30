import { OptimizedImage } from "./OptimizedImage";

/**
 * ColorIcon组件
 * 用于统一显示材料颜色图标
 * - DEFAULT颜色显示为白色方块，中间显示"ORIG"文字
 * - 其他颜色显示实际的颜色图片
 * - 集成OptimizedImage实现懒加载和性能优化
 */

interface ColorIconProps {
  imageUrl?: string | null;
  colorCode: string;
  colorName?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ColorIcon({ 
  imageUrl, 
  colorCode, 
  colorName, 
  size = "md",
  className = "" 
}: ColorIconProps) {
  // 根据尺寸设置大小
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
  };
  
  // 如果有图片URL，使用OptimizedImage显示图片（懒加载）
  if (imageUrl) {
    return (
      <OptimizedImage
        src={imageUrl}
        alt={colorName || colorCode}
        className={`${sizeClasses[size]} rounded`}
      />
    );
  }
  
  // 没有图片时显示占位符
  return (
    <div 
      className={`${sizeClasses[size]} flex items-center justify-center bg-gray-100 border border-gray-300 rounded text-gray-400 ${className}`}
      title={colorName || colorCode}
    >
      ?
    </div>
  );
}
