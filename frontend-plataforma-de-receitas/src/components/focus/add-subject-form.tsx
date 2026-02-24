import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import useFocusTimer from "@/hooks/useFocusTimer";

export function AddSubjectForm() {
  const [name, setName] = useState("");
  const [emphasis, setEmphasis] = useState("5");
  const addSubject = useFocusTimer((s) => s.addSubject);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    addSubject(trimmed, parseInt(emphasis) || 5);
    setName("");
    setEmphasis("5");
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-end">
      <div className="flex-1">
        <label className="text-xs text-muted-foreground mb-1 block">Nome da matéria</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Português"
        />
      </div>
      <div className="w-24">
        <label className="text-xs text-muted-foreground mb-1 block">Ênfase (1-10)</label>
        <Input
          type="number"
          step="1"
          min="1"
          max="10"
          value={emphasis}
          onChange={(e) => setEmphasis(e.target.value)}
          className="text-center"
        />
      </div>
      <Button type="submit" size="icon" disabled={!name.trim()}>
        <Plus className="h-4 w-4" />
      </Button>
    </form>
  );
}
