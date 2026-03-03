import { DragDropProvider } from "@dnd-kit/react";
import { useTaskStore } from "../store/taskStore";
import { Section } from "./Section";

export function TaskList() {
  const { sections, tasks, reorderTask, makeSubtask } = useTaskStore();

  const sortedSections = [...sections].sort((a, b) => a.order - b.order);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleDragOver = (event: any) => {
    const { source, target } = event.operation;
    console.log('[DragOver] source:', source?.id, 'target:', target?.id);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleDragEnd = (event: any) => {
    const { source, target } = event.operation;
    console.log('[DragEnd] source:', source?.id, 'target:', target?.id, 'full event:', event);
    if (!source || !target) {
      console.log('[DragEnd] EARLY RETURN: no source or target');
      return;
    }

    const sourceId = String(source.id);
    const targetId = String(target.id);
    console.log('[DragEnd] sourceId:', sourceId, 'targetId:', targetId);

    // Parse zone-based target IDs: "{taskId}::top", "{taskId}::center", "{taskId}::bottom"
    const zoneMatch = targetId.match(/^(.+)::(top|center|bottom)$/);
    if (!zoneMatch) {
      console.log('[DragEnd] NO ZONE MATCH for targetId:', targetId);
      return;
    }

    const [, targetTaskId, zone] = zoneMatch;
    console.log('[DragEnd] zone:', zone, 'targetTaskId:', targetTaskId);
    if (targetTaskId === sourceId) {
      console.log('[DragEnd] SAME TASK, skipping');
      return;
    }

    const targetTask = tasks.find((t) => t.id === targetTaskId);
    if (!targetTask) return;

    if (zone === "center" && !targetTask.parentId) {
      // Drop on center → make subtask (only if target is top-level)
      console.log('[DragEnd] MAKING SUBTASK:', sourceId, '->', targetTaskId);
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
    <DragDropProvider onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
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
