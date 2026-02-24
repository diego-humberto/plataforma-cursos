import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect } from "react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Code,
} from "lucide-react";

type TiptapEditorProps = {
  content: string;
  onChange: (html: string) => void;
  onFocus?: () => void;
  onSubmit?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  editable?: boolean;
};

export default function TiptapEditor({
  content,
  onChange,
  onFocus,
  onSubmit,
  placeholder = "Digite sua anotação...",
  autoFocus = false,
  editable = true,
}: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      Underline,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    editable,
    autofocus: autoFocus,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    onFocus: () => {
      onFocus?.();
    },
    editorProps: {
      attributes: {
        class: "tiptap outline-none min-h-[60px] px-3 py-2 text-sm",
      },
      handleKeyDown: (_view, event) => {
        if (
          event.key === "Enter" &&
          (event.ctrlKey || event.metaKey) &&
          onSubmit
        ) {
          event.preventDefault();
          onSubmit();
          return true;
        }
        return false;
      },
    },
  });

  // Sync content from outside (e.g. when clearing after save)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    // Only reset if the external content is empty (clear after save)
    // or if it's fundamentally different (switching notes)
    if (content === "" && current !== "<p></p>") {
      editor.commands.clearContent();
    } else if (
      content !== "" &&
      content !== current &&
      content !== "<p></p>"
    ) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) return null;

  return (
    <div className="rounded-md border border-input bg-background overflow-hidden focus-within:ring-1 focus-within:ring-ring">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 border-b px-2 py-1 bg-muted/30">
        <ToolbarButton
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Negrito (Ctrl+B)"
        >
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Itálico (Ctrl+I)"
        >
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Sublinhado (Ctrl+U)"
        >
          <UnderlineIcon className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Tachado"
        >
          <Strikethrough className="h-3.5 w-3.5" />
        </ToolbarButton>

        <div className="w-px h-4 bg-border mx-1" />

        <ToolbarButton
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Lista com marcadores"
        >
          <List className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Lista numerada"
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarButton>

        <div className="w-px h-4 bg-border mx-1" />

        <ToolbarButton
          active={editor.isActive("codeBlock")}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          title="Bloco de código"
        >
          <Code className="h-3.5 w-3.5" />
        </ToolbarButton>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />
    </div>
  );
}

function ToolbarButton({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded transition-colors ${
        active
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      }`}
    >
      {children}
    </button>
  );
}
