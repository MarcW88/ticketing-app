'use client';

import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import type { Quest, QuestStatus } from '@/lib/types';
import QuestCard from './QuestCard';

interface QuestBoardProps {
  quests: Quest[];
  universeFilter: string;
  onStatusChange: (id: string, status: QuestStatus) => void;
  onComplete: (id: string) => void;
  onEdit: (quest: Quest) => void;
  onDelete: (id: string) => void;
  onNewQuest: () => void;
  onTimerStart: (id: string) => void;
  onTimerPause: (id: string) => void;
  onTimerReset: (id: string) => void;
}

const COLUMNS: { status: QuestStatus; label: string; accent: string; dropDisabled?: boolean }[] = [
  { status: 'backlog', label: "Port d'Ithaque", accent: '#C9963C' },
  { status: 'active',  label: 'En Mer',          accent: '#6AACCF' },
  { status: 'done',    label: 'Ithaque',          accent: '#7FAB70' },
  { status: 'haunted', label: 'Épreuves',         accent: '#9B7FE0', dropDisabled: true },
];

function EmptyColumn({ status, onNewQuest, isDraggingOver }: { status: QuestStatus; onNewQuest: () => void; isDraggingOver: boolean }) {
  if (isDraggingOver) return null;
  const msgs: Record<string, { text: string; cta: string | null }> = {
    backlog: { text: 'Aucune mission en attente.', cta: 'Nouvelle mission' },
    active:  { text: 'Aucune mission en cours.', cta: null },
    done:    { text: 'Glissez une carte ici pour la terminer.', cta: null },
    haunted: { text: 'Aucune mission bloquée.', cta: null },
    cursed:  { text: 'Aucune mission maudite.', cta: null },
  };
  const m = msgs[status] ?? msgs.backlog;
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center opacity-60">
      <p className="text-xs" style={{ color: 'var(--tweed)' }}>{m.text}</p>
      {m.cta && (
        <button
          onClick={onNewQuest}
          className="mt-3 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all hover:shadow-sm"
          style={{ borderColor: 'var(--petrol)', color: 'var(--petrol)' }}
        >
          {m.cta}
        </button>
      )}
    </div>
  );
}

export default function QuestBoard({
  quests,
  universeFilter,
  onStatusChange,
  onComplete,
  onEdit,
  onDelete,
  onNewQuest,
  onTimerStart,
  onTimerPause,
  onTimerReset,
}: QuestBoardProps) {
  const filtered = (universeFilter === 'all' || !['backlog','active','done','haunted','cursed'].includes(universeFilter))
    ? quests
    : quests.filter(q => q.status === universeFilter || (universeFilter === 'haunted' && q.status === 'cursed'));

  function getColumnQuests(status: QuestStatus) {
    if (status === 'haunted') {
      return filtered.filter(q => q.status === 'haunted' || q.status === 'cursed');
    }
    return filtered.filter(q => q.status === status);
  }

  function handleDragEnd(result: DropResult) {
    const { destination, draggableId } = result;
    if (!destination) return;
    const newStatus = destination.droppableId as QuestStatus;
    if (newStatus === result.source.droppableId && result.destination?.index === result.source.index) return;

    if (newStatus === 'done') {
      onComplete(draggableId);
    } else {
      onStatusChange(draggableId, newStatus);
    }
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-3 pb-6 px-4 pt-4 w-full" style={{ minHeight: 'calc(100vh - 200px)' }}>
        {COLUMNS.map(col => {
          const colQuests = getColumnQuests(col.status);
          return (
            <div
              key={col.status}
              className="kanban-column flex-1 flex flex-col min-w-0"
              style={{ minWidth: '200px' }}
            >
              {/* Column header */}
              <div
                className="flex items-center justify-between px-4 py-3.5 rounded-t-2xl"
                style={{ borderBottom: `1px solid ${col.accent}28`, borderTop: `2px solid ${col.accent}` }}
              >
                <div className="flex items-center gap-2.5">
                  <span className="cinematic-column" style={{ color: col.accent }}>
                    {col.label}
                  </span>
                </div>
                <span
                  className="text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full"
                  style={{ background: `${col.accent}18`, color: col.accent, fontSize: '11px' }}
                >
                  {colQuests.length}
                </span>
              </div>

              {/* Droppable card zone */}
              <Droppable droppableId={col.status} isDropDisabled={col.dropDisabled}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 rounded-b-2xl transition-all duration-150"
                    style={{
                      minHeight: 120,
                      background: snapshot.isDraggingOver && !col.dropDisabled
                        ? `${col.accent}0d`
                        : undefined,
                      outline: snapshot.isDraggingOver && !col.dropDisabled
                        ? `2px dashed ${col.accent}55`
                        : '2px dashed transparent',
                      outlineOffset: '-6px',
                    }}
                  >
                    {colQuests.length === 0 ? (
                      <EmptyColumn
                        status={col.status}
                        onNewQuest={onNewQuest}
                        isDraggingOver={snapshot.isDraggingOver}
                      />
                    ) : (
                      colQuests.map((quest, index) => (
                        <Draggable
                          key={quest.id}
                          draggableId={quest.id}
                          index={index}
                          isDragDisabled={col.status === 'done'}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              style={{
                                ...provided.draggableProps.style,
                                opacity: snapshot.isDragging ? 0.93 : 1,
                                boxShadow: snapshot.isDragging
                                  ? '0 16px 40px rgba(0,0,0,0.5)'
                                  : undefined,
                                cursor: snapshot.isDragging ? 'grabbing' : 'grab',
                              }}
                            >
                              <QuestCard
                                quest={quest}
                                onStatusChange={onStatusChange}
                                onComplete={onComplete}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onTimerStart={onTimerStart}
                                onTimerPause={onTimerPause}
                                onTimerReset={onTimerReset}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}

      </div>
    </DragDropContext>
  );
}
