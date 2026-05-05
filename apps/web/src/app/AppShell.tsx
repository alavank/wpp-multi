import { Sidebar } from "../components/Sidebar";
import { QueueTabs } from "../features/queues/QueueTabs";
import { ConversationList } from "../features/queues/ConversationList";
import { ChatPanel } from "../features/chat/ChatPanel";
import { ContactDetailsPanel } from "../features/chat/ContactDetailsPanel";
import { DepartmentSelector } from "../features/departments/DepartmentSelector";

export function AppShell() {
  return (
    <div className="flex h-screen bg-base-100 text-base-content">
      <Sidebar />
      <div className="flex flex-col w-80 border-r border-base-300">
        <DepartmentSelector />
        <QueueTabs />
        <ConversationList />
      </div>
      <ChatPanel className="flex-1" />
      <ContactDetailsPanel />
    </div>
  );
}
