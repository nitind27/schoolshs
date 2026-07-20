"use client";

import { ChatApp } from "@/components/chat/chat-app";

/**
 * Full-viewport school chat (navbar icon → /chat).
 * Fills the area under the fixed top bar and beside the sidebar.
 */
export default function ChatPage() {
  return (
    <div className="fixed inset-x-0 bottom-0 top-14 z-30 bg-white lg:left-[260px]">
      <ChatApp variant="page" />
    </div>
  );
}
