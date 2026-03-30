/**
 * 材料类型定义
 */
export const MATERIAL_TYPES = [
  { value: "fabric", label: "布料", icon: "🧵" },
  { value: "leg", label: "木腿", icon: "🪑" },
  { value: "armrest", label: "扶手", icon: "🛋️" },
  { value: "filling", label: "填充物", icon: "🧶" },
  { value: "cushion", label: "坐垫", icon: "💺" },
  { value: "backrest", label: "靠背", icon: "🪑" },
  { value: "frame", label: "框架", icon: "🔲" },
  { value: "accessory", label: "配件", icon: "🔧" },
  { value: "other", label: "其他", icon: "📦" },
] as const;

export type MaterialType = typeof MATERIAL_TYPES[number]["value"];

/**
 * 获取材料类型标签
 */
export function getMaterialTypeLabel(type: string): string {
  const materialType = MATERIAL_TYPES.find((t) => t.value === type);
  return materialType ? materialType.label : type;
}

/**
 * 获取材料类型图标
 */
export function getMaterialTypeIcon(type: string): string {
  const materialType = MATERIAL_TYPES.find((t) => t.value === type);
  return materialType ? materialType.icon : "📦";
}

/**
 * 默认材料颜色ID（白色ORGI色）
 */
export const DEFAULT_MATERIAL_COLOR_ID = "DEFAULT-001";
