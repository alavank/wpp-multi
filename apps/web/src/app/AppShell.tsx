import { Sidebar } from "../components/Sidebar";
import { QueueTabs } from "../features/queues/QueueTabs";
import { ConversationList } from "../features/queues/ConversationList";
import { ChatPanel } from "../features/chat/ChatPanel";
import { ContactDetailsPanel } from "../features/chat/ContactDetailsPanel";
import { DepartmentSelector } from "../features/departments/DepartmentSelector";

export function AppShell() {
  return (
    <div className="h-screen p-3 sm:p-5 lg:p-6 overflow-hidden">
      <div className="surface-card h-full flex overflow-hidden text-base-content">
        <Sidebar />

        <div className="flex flex-col w-[22rem] shrink-0 border-l divider-hair">
          <DepartmentSelector />
          <QueueTabs />
          <ConversationList />
        </div>

        <ChatPanel className="flex-1 min-w-0 border-l divider-hair" />
        <ContactDetailsPanel />
      </div>
    </div>
  );
}
