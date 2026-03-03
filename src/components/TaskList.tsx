import { DragDropProvider } from "@dnd-kit/react";
import { useTaskStore } from "../store/taskStore";
import { Section } from "./Section";

export function TaskList() {
  const { sections, tasks, reorderTask, makeSubtask } = useTaskStore();

  const sortedSections = [...sections].sort((a, b) => a.order - b.order);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleDragEnd = (event: any) => {
    const { source, target } = event.operation;
    if (!source || !target) return;

    const sourceId = String(source.id);
    const targetId = String(target.id);

    // Parse zone-based target IDs: "{taskId}::top", "{taskId}::center", "{taskId}::bottom"
    const zoneMatch = targetId.match(/^(.+)::(top|center|bottom)$/);
    if (!zoneMatch) return;

    const [, targetTaskId, zone] = zoneMatch;
    if (targetTaskId === sourceId) return;

    const targetTask = tasks.find((t) => t.id === targetTaskId);
    if (!targetTask) return;

    if (zone === "center" && !targetTask.parentId) {
      // Drop on center → make subtask (only if target is top-level)
      makeSubtask(sourceId, targetTaskId);
    } else {
      // Drop on top edge → insert before (order - 0.5)
      // Drop on bottom edge → insert after (order + 0.5)
      // Drop on center of a subtask → treat as insert after
      const orderOffset = zone === "top" ? -0.5 : 0.5;
      reorderTask(sourceId, targetTask.sectionId, targetTask.order + orderOffset);
    }
  };

  return (
    <DragDropProvider onDragEnd={handleDragEnd}>
      <div className="space-y-1">
        {sortedSections.map((section, index) => (
          <Section
            key={section.id}
            id={section.id}
            name={section.name}
            isDefault={section.isDefault}
            index={index}
          />
        ))}
      </div>
    </DragDropProvider>
  );
}
