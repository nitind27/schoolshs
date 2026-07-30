"use client";

import { ChatApp } from "@/components/chat/chat-app";

/**
 * Full-viewport school chat (navbar icon → /chat).
 * Fills the area under the fixed top bar and beside the sidebar.
 */
export default function ChatPage() {
  return (
    <div className="chat-page-shell fixed inset-x-0 bottom-0 top-14 z-30 min-h-0 bg-white lg:left-[var(--shell-sidebar-w)]">
      <ChatApp variant="page" />
    </div>
  );
}
