// Imports
import dynamic from "next/dynamic";

export default function PromptPage() {
  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col">
      <header className="mb-8">
        <h1 className="text-2xl font-bold select-none">Nexus AI Assistant</h1>
        <p className="text-muted-foreground text-sm select-none">
          Ask questions or generate content
        </p>
      </header>
    </div>
  );
}
