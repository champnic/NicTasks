import { DragDropProvider } from "@dnd-kit/react";
import { useTaskStore } from "../store/taskStore";
import { Section } from "./Section";

export function TaskList() {
  const { sections, tasks, reorderTask, makeSubtask, reorderSection } = useTaskStore();

  const sortedSections = [...sections].sort((a, b) => a.order - b.order);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleDragEnd = (event: any) => {
    const { source, target } = event.operation;
    console.log('[DragEnd] source id:', source?.id, 'target id:', target?.id);
    if (!source || !target) {
      console.log('[DragEnd] No source or target, aborting');
      return;
    }

    const sourceId = String(source.id);
    const targetId = String(target.id);
    console.log('[DragEnd] sourceId:', sourceId, 'targetId:', targetId);

    // Handle section reorder (sortable sections)
    const sourceSectionMatch = sourceId.match(/^section-(.+)$/);
    if (sourceSectionMatch) {
      // With @dnd-kit/react sortable, items reorder visually during drag.
      // source.sortable has initialIndex (where it started) and index (where it ended up).
      const fromIndex = source?.sortable?.initialIndex;
      const toIndex = source?.sortable?.index;
      const sourceSectionId = sourceSectionMatch[1];
      console.log('[DragEnd] Section sortable:', sourceSectionId, 'fromIndex:', fromIndex, 'toIndex:', toIndex);
      if (fromIndex !== undefined && toIndex !== undefined && fromIndex !== toIndex) {
        console.log('[DragEnd] Reordering section', sourceSectionId, 'from', fromIndex, 'to', toIndex, '| sortedSections:', sortedSections.map(s => `${s.id}(${s.order})`));
        reorderSection(sourceSectionId, toIndex);
      } else {
        console.log('[DragEnd] Section did not move (fromIndex === toIndex)');
      }
      return;
    }

    // Handle section-level drops: "section-drop::{sectionId}"
    const sectionDropMatch = targetId.match(/^section-drop::(.+)$/);
    if (sectionDropMatch) {
      const targetSectionId = sectionDropMatch[1];
      const sectionTasks = tasks.filter((t) => t.sectionId === targetSectionId && !t.parentId);
      const maxOrder = sectionTasks.reduce((max, t) => Math.max(max, t.order), -1);
      reorderTask(sourceId, targetSectionId, maxOrder + 1);
      return;
    }

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
            index={index}
          />
        ))}
      </div>
    </DragDropProvider>
  );
}
