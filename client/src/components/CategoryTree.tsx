import { useState } from "react";
import { ChevronRight, ChevronDown, Folder, FolderOpen, Plus, Edit2, Trash2, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export interface CategoryNode {
  id: number;
  name: string;
  parentId: number | null;
  productCount: number;
  children?: CategoryNode[];
  sortOrder: number;
  isEnabled: boolean;
}

interface CategoryTreeProps {
  categories: CategoryNode[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onAddChild: (parentId: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onMove: (categoryId: number, newParentId: number | null, newSortOrder: number) => void;
}

export default function CategoryTree({
  categories,
  selectedId,
  onSelect,
  onAddChild,
  onEdit,
  onDelete,
  onMove,
}: CategoryTreeProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const activeId = Number(active.id);
    const overId = Number(over.id);

    // Find the active and over categories
    const findCategory = (id: number, nodes: CategoryNode[]): CategoryNode | null => {
      for (const node of nodes) {
        if (node.id === id) return node;
        if (node.children) {
          const found = findCategory(id, node.children);
          if (found) return found;
        }
      }
      return null;
    };

    const activeCategory = findCategory(activeId, categories);
    const overCategory = findCategory(overId, categories);

    if (!activeCategory || !overCategory) return;

    // Check if moving to a descendant (prevent circular reference)
    const isDescendant = (parentId: number, childId: number): boolean => {
      const child = findCategory(childId, categories);
      if (!child || !child.children) return false;
      
      for (const node of child.children) {
        if (node.id === parentId) return true;
        if (isDescendant(parentId, node.id)) return true;
      }
      return false;
    };

    if (isDescendant(activeId, overId)) {
      console.log("Cannot move a category to its own descendant");
      return;
    }

    // Move the category
    onMove(activeId, overId, 0);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-1">
        {categories.map((category) => (
          <TreeNode
            key={category.id}
            node={category}
            level={0}
            selectedId={selectedId}
            onSelect={onSelect}
            onAddChild={onAddChild}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </DndContext>
  );
}

interface TreeNodeProps {
  node: CategoryNode;
  level: number;
  selectedId: number | null;
  onSelect: (id: number) => void;
  onAddChild: (parentId: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}

function TreeNode({
  node,
  level,
  selectedId,
  onSelect,
  onAddChild,
  onEdit,
  onDelete,
}: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const hasChildren = node.children && node.children.length > 0;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: node.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isSelected = selectedId === node.id;

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={`
          group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer relative
          hover:bg-gray-100 transition-all duration-200
          ${isSelected ? "bg-blue-50 border-l-4 border-blue-500" : ""}
        `}
        style={{ paddingLeft: `${level * 24 + 12}px` }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => onSelect(node.id)}
      >
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="flex-shrink-0 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical className="w-4 h-4 text-gray-400" />
        </div>

        {/* Expand/Collapse Arrow */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="flex-shrink-0 w-5 h-5 flex items-center justify-center"
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            )
          ) : (
            <span className="w-4 h-4" />
          )}
        </button>

        {/* Folder Icon */}
        <div className="flex-shrink-0">
          {isExpanded && hasChildren ? (
            <FolderOpen className="w-4 h-4 text-gray-500" />
          ) : (
            <Folder className="w-4 h-4 text-gray-500" />
          )}
        </div>

        {/* Category Name */}
        <span className="flex-1 text-sm font-medium text-gray-900">
          {node.name}
        </span>

        {/* Product Count */}
        <span className="text-xs text-gray-400">({node.productCount})</span>

        {/* Hover Actions */}
        <div 
          className="flex items-center gap-1 ml-2 transition-opacity"
          style={{ 
            opacity: isHovered ? 1 : 0,
            pointerEvents: isHovered ? 'auto' : 'none'
          }}
        >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddChild(node.id);
              }}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              title="添加子类目"
            >
              <Plus className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(node.id);
              }}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              title="编辑"
            >
              <Edit2 className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(node.id);
              }}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              title="删除"
            >
              <Trash2 className="w-4 h-4 text-red-600" />
            </button>
          </div>
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div>
          {node.children!.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              onAddChild={onAddChild}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
