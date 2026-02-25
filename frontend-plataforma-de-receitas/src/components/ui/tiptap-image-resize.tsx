import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { useCallback, useRef, useState } from "react";
import { AlignLeft, AlignCenter, AlignRight } from "lucide-react";

// React component for the resizable image
function ResizableImageView({ node, updateAttributes, selected }: any) {
  const [resizing, setResizing] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setResizing(true);
      startX.current = e.clientX;
      startWidth.current = imgRef.current?.offsetWidth || 300;

      const onMouseMove = (ev: MouseEvent) => {
        const diff = ev.clientX - startX.current;
        const newWidth = Math.max(80, startWidth.current + diff);
        updateAttributes({ width: newWidth });
      };

      const onMouseUp = () => {
        setResizing(false);
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [updateAttributes]
  );

  const width = node.attrs.width;
  const align = node.attrs.align || "left";

  const wrapperAlign =
    align === "center" ? "center" :
    align === "right" ? "flex-end" : "flex-start";

  return (
    <NodeViewWrapper
      className="tiptap-image-wrapper"
      style={{ display: "flex", justifyContent: wrapperAlign }}
      data-drag-handle
    >
      <div
        className={`tiptap-image-resizable ${selected ? "selected" : ""}`}
        style={{ width: width ? `${width}px` : "auto", maxWidth: "100%" }}
      >
        <img
          ref={imgRef}
          src={node.attrs.src}
          alt={node.attrs.alt || ""}
          title={node.attrs.title || ""}
          style={{ width: "100%", height: "auto", display: "block" }}
          draggable={false}
        />
        {selected && (
          <div className="image-resize-handle se" onMouseDown={handleMouseDown} />
        )}
        {selected && (
          <div
            className="image-align-toolbar"
            contentEditable={false}
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          >
            <button
              type="button"
              className={align === "left" ? "active" : ""}
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onClick={() => updateAttributes({ align: "left" })}
              title="Alinhar à esquerda"
            >
              <AlignLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              className={align === "center" ? "active" : ""}
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onClick={() => updateAttributes({ align: "center" })}
              title="Centralizar"
            >
              <AlignCenter className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              className={align === "right" ? "active" : ""}
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onClick={() => updateAttributes({ align: "right" })}
              title="Alinhar à direita"
            >
              <AlignRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}

// Custom Image extension with resize support
const ResizableImage = Node.create({
  name: "image",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
      width: {
        default: null,
        parseHTML: (el: HTMLElement) => {
          const w = el.getAttribute("width");
          if (w) return Number(w);
          const style = el.getAttribute("style") || "";
          const match = style.match(/width:\s*(\d+)px/);
          return match ? Number(match[1]) : null;
        },
        renderHTML: () => ({}),
      },
      align: {
        default: "left",
        parseHTML: (el: HTMLElement) => el.getAttribute("data-align") || "left",
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [{ tag: "img[src]" }];
  },

  renderHTML({ node }) {
    const { src, alt, title, width, align } = node.attrs;
    const styles: string[] = [];
    if (width) {
      styles.push(`width: ${width}px; max-width: 100%; height: auto;`);
    }
    if (align === "center") {
      styles.push("display: block; margin-left: auto; margin-right: auto;");
    } else if (align === "right") {
      styles.push("display: block; margin-left: auto; margin-right: 0;");
    }
    const attrs: Record<string, any> = { src, alt, title };
    if (align && align !== "left") {
      attrs["data-align"] = align;
    }
    if (styles.length) {
      attrs.style = styles.join(" ");
    }
    return ["img", attrs];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },

  addCommands() {
    return {
      setImage:
        (options: { src: string; alt?: string; title?: string; width?: number }) =>
        ({ commands }: any) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    } as any;
  },
});

export default ResizableImage;
