// Types for chat messages between user and AI assistant
export type Message = {
  id: string;
  role: "user" | "ai";
  content: string;
};