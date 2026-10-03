# Make drag and drop accessible

> Drag and drop interfaces provide keyboard alternatives and proper ARIA attributes for accessibility.

**Priority:** medium · **Difficulty:** advanced · **Time:** 35 min

---
Accessible drag and drop requires keyboard alternatives and proper ARIA attributes to support all users.

## Code Example

```html
<div role="list" aria-label="Sortable tasks" class="sortable-list">
  <div
    role="listitem"
    tabindex="0"
    aria-grabbed="false"
    draggable="true"
    class="sortable-item"
  >
    <span class="sortable-item__handle" aria-hidden="true">⋮⋮</span>
    <span class="sortable-item__content">Task 1</span>
    <span class="sr-only">Press Space to pick up, use arrows to reorder</span>
  </div>

  <div
    role="listitem"
    tabindex="0"
    aria-grabbed="false"
    draggable="true"
    class="sortable-item"
  >
    <span class="sortable-item__handle" aria-hidden="true">⋮⋮</span>
    <span class="sortable-item__content">Task 2</span>
    <span class="sr-only">Press Space to pick up, use arrows to reorder</span>
  </div>
</div>

<!-- Live region for announcements -->
<div id="drag-announcements" aria-live="assertive" class="sr-only"></div>
```

## Why It Matters

Drag and drop is mouse-dependent by default—keyboard and screen reader users are completely locked out without proper alternatives and ARIA announcements.

## Accessibility Requirements

| Requirement | Implementation |
|-------------|----------------|
| Keyboard alternative | Arrow keys, Enter to pick up/drop |
| ARIA attributes | `aria-grabbed`, `aria-dropeffect` |
| Announcements | Live regions for state changes |
| Visual feedback | Focus indicators for drop zones |
| Instructions | Clear usage guidance |

## Keyboard Interaction Pattern

| Key | Action |
|-----|--------|
| `Tab` | Navigate between draggable items |
| `Space` / `Enter` | Pick up / drop item |
| `Arrow keys` | Move item to adjacent position |
| `Escape` | Cancel drag operation |

## React Sortable List

```tsx

interface SortableItem {
  id: string
  content: string
}

interface SortableListProps {
  items: SortableItem[]
  onReorder: (items: SortableItem[]) => void
}

  const [grabbedIndex, setGrabbedIndex] = useState<number | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const listRef = useRef {
    setAnnouncement('')
    // Force re-render for screen reader
    requestAnimationFrame(() => setAnnouncement(message))
  }

  const handleKeyDown = (e: KeyboardEvent, index: number) => {
    switch (e.key) {
      case ' ':
      case 'Enter':
        e.preventDefault()
        if (grabbedIndex === null) {
          // Pick up
          setGrabbedIndex(index)
          announce(`${items[index].content} grabbed. Use arrow keys to move, Space to drop, Escape to cancel.`)
        } else {
          // Drop
          setGrabbedIndex(null)
          announce(`${items[grabbedIndex].content} dropped at position ${index + 1}.`)
        }
        break

      case 'ArrowUp':
        e.preventDefault()
        if (grabbedIndex !== null && grabbedIndex > 0) {
          moveItem(grabbedIndex, grabbedIndex - 1)
          setGrabbedIndex(grabbedIndex - 1)
          announce(`${items[grabbedIndex].content} moved to position ${grabbedIndex}.`)
        } else if (grabbedIndex === null && index > 0) {
          focusItem(index - 1)
        }
        break

      case 'ArrowDown':
        e.preventDefault()
        if (grabbedIndex !== null && grabbedIndex < items.length - 1) {
          moveItem(grabbedIndex, grabbedIndex + 1)
          setGrabbedIndex(grabbedIndex + 1)
          announce(`${items[grabbedIndex].content} moved to position ${grabbedIndex + 2}.`)
        } else if (grabbedIndex === null && index < items.length - 1) {
          focusItem(index + 1)
        }
        break

      case 'Escape':
        if (grabbedIndex !== null) {
          e.preventDefault()
          announce(`${items[grabbedIndex].content} reorder cancelled.`)
          setGrabbedIndex(null)
        }
        break
    }
  }

  const moveItem = (from: number, to: number) => {
    const newItems = [...items]
    const [moved] = newItems.splice(from, 1)
    newItems.splice(to, 0, moved)
    onReorder(newItems)
  }

  const focusItem = (index: number) => {
    const list = listRef.current
    const items = list?.querySelectorAll('[role="listitem"]')
    ;(items?.[index] as HTMLElement)?.focus()
  }

  // Mouse drag handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move'
    setGrabbedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (grabbedIndex !== null && grabbedIndex !== index) {
      moveItem(grabbedIndex, index)
      setGrabbedIndex(index)
    }
  }

  const handleDragEnd = () => {
    setGrabbedIndex(null)
  }

  return (
    <>
      <div
        ref={listRef}
        role="list"
        aria-label="Sortable items"
        className="sortable-list"
      >
        {items.map((item, index) => (
          <div
            key={item.id}
            role="listitem"
            tabIndex={0}
            aria-grabbed={grabbedIndex === index}
            aria-describedby="drag-instructions"
            draggable
            onKeyDown={(e) => handleKeyDown(e, index)}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={`sortable-item ${
              grabbedIndex === index ? 'sortable-item--grabbed' : ''
            }`}
          >
            <span className="sortable-item__handle" aria-hidden="true">
              ⋮⋮
            </span>
            <span className="sortable-item__content">{item.content}</span>
          </div>
        ))}
      </div>

      <div id="drag-instructions" className="sr-only">
        Press Space to pick up. Use Arrow keys to move. Press Space to drop. Press Escape to cancel.
      </div>

      {/* Live region for announcements */}
      <div aria-live="assertive" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
    </>
  )
}
```

## Kanban Board Example

```tsx
interface Task {
  id: string
  title: string
  column: 'todo' | 'in-progress' | 'done'
}

interface KanbanBoardProps {
  tasks: Task[]
  onMoveTask: (taskId: string, newColumn: Task['column']) => void
}

  const [selectedTask, setSelectedTask] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')

  const columns: Task['column'][] = ['todo', 'in-progress', 'done']
  const columnLabels = {
    'todo': 'To Do',
    'in-progress': 'In Progress',
    'done': 'Done'
  }

  const handleTaskKeyDown = (e: KeyboardEvent, task: Task) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      if (selectedTask === task.id) {
        setSelectedTask(null)
        setAnnouncement(`${task.title} deselected`)
      } else {
        setSelectedTask(task.id)
        setAnnouncement(`${task.title} selected. Use arrow keys to move between columns.`)
      }
    }

    if (selectedTask === task.id) {
      const currentColumnIndex = columns.indexOf(task.column)

      if (e.key === 'ArrowLeft' && currentColumnIndex > 0) {
        e.preventDefault()
        const newColumn = columns[currentColumnIndex - 1]
        onMoveTask(task.id, newColumn)
        setAnnouncement(`${task.title} moved to ${columnLabels[newColumn]}`)
      }

      if (e.key === 'ArrowRight' && currentColumnIndex < columns.length - 1) {
        e.preventDefault()
        const newColumn = columns[currentColumnIndex + 1]
        onMoveTask(task.id, newColumn)
        setAnnouncement(`${task.title} moved to ${columnLabels[newColumn]}`)
      }

      if (e.key === 'Escape') {
        setSelectedTask(null)
        setAnnouncement(`${task.title} deselected`)
      }
    }
  }

  return (
    <div className="kanban-board">
      {columns.map(column => (
        <div
          key={column}
          className="kanban-column"
          aria-label={columnLabels[column]}
        >
          <h2>{columnLabels[column]}</h2>
          <div role="list">
            {tasks
              .filter(t => t.column === column)
              .map(task => (
                <div
                  key={task.id}
                  role="listitem"
                  tabIndex={0}
                  aria-grabbed={selectedTask === task.id}
                  aria-describedby="kanban-instructions"
                  onKeyDown={(e) => handleTaskKeyDown(e, task)}
                  className={`kanban-task ${
                    selectedTask === task.id ? 'kanban-task--selected' : ''
                  }`}
                >
                  {task.title}
                </div>
              ))}
          </div>
        </div>
      ))}

      <div id="kanban-instructions" className="sr-only">
        Press Space to select. Use Left and Right arrows to move between columns.
      </div>

      <div aria-live="assertive" className="sr-only">
        {announcement}
      </div>
    </div>
  )
}
```

## Styling

```css
.sortable-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.sortable-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: grab;
}

.sortable-item:focus-visible {
  outline: 2px solid #0066cc;
  outline-offset: 2px;
}

.sortable-item--grabbed {
  background: #e3f2fd;
  border-color: #2196f3;
  cursor: grabbing;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.sortable-item__handle {
  color: #999;
  font-size: 1.25rem;
  line-height: 1;
}

/* Screen reader only */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

/* Kanban board */
.kanban-board {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.kanban-task {
  padding: 1rem;
  background: #fff;
  border: 2px solid transparent;
  border-radius: 4px;
  cursor: pointer;
}

.kanban-task:focus-visible {
  outline: 2px solid #0066cc;
  outline-offset: 2px;
}

.kanban-task--selected {
  border-color: #2196f3;
  background: #e3f2fd;
}
```

## Verification

1. Navigate to draggable items with Tab
2. Press Space to pick up item
3. Use Arrow keys to reposition
4. Press Space to drop
5. Press Escape to cancel
6. Verify screen reader announces all state changes
7. Test mouse drag still works
8. Check visual feedback for grabbed state

Native HTML5 drag and drop is not keyboard accessible. Always implement keyboard alternatives alongside mouse drag functionality.