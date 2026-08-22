import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { eduhubPlacementTestsAdmin } from "@/api/eduhubClient";
import type {
  PlacementTestAdminResponse,
  PlacementTestQuestion,
  PlacementTestUpsertRequest,
} from "@/api/eduhubClient";
import type { PlacementTestBand } from "@/api/eduhubClient";
import { useCourseLevels } from "@/features/teacher/data/courseLevels";

const OPTION_LETTERS = ["A", "B", "C", "D"] as const;

function emptyQuestion(): PlacementTestQuestion {
  return {
    question: "",
    points: 10,
    options: OPTION_LETTERS.map((letter) => ({ letter, text: "", isCorrect: letter === "A" })),
  };
}

type Props = {
  /** Existing test to edit, or null to create a new one. */
  existing: PlacementTestAdminResponse | null;
  onSaved: () => void;
  onCancel: () => void;
};

/**
 * Create/edit form for an institution-wide placement test. Deliberately has no class selector:
 * a placement test is scoped by subject and gates every class in that subject.
 */
export function AdminPlacementTestEditor({ existing, onSaved, onCancel }: Props) {
  const { levels } = useCourseLevels();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number | "">(30);
  const [passingScore, setPassingScore] = useState<number | "">(70);
  const [maxAttempts, setMaxAttempts] = useState<number | "">(3);
  const [isPublished, setIsPublished] = useState(true);
  const [questions, setQuestions] = useState<PlacementTestQuestion[]>([emptyQuestion()]);
  const [bands, setBands] = useState<PlacementTestBand[]>([
    { minScore: 0, maxScore: 100, levelCode: "" },
  ]);

  useEffect(() => {
    if (!existing) return;
    setTitle(existing.title);
    setSubject(existing.subject ?? "");
    setDescription(existing.description ?? "");
    setTimeLimitMinutes(existing.timeLimitMinutes ?? "");
    setPassingScore(existing.passingScore ?? 70);
    setMaxAttempts(existing.maxAttempts ?? "");
    setIsPublished(existing.isPublished);
    setQuestions(existing.questions.length > 0 ? existing.questions : [emptyQuestion()]);
    setBands(existing.bands.length > 0 ? existing.bands : [{ minScore: 0, maxScore: 100, levelCode: "" }]);
  }, [existing]);

  const updateQuestion = (index: number, patch: Partial<PlacementTestQuestion>) =>
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));

  const setCorrectOption = (questionIndex: number, letter: string) =>
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === questionIndex
          ? { ...q, options: q.options.map((o) => ({ ...o, isCorrect: o.letter === letter })) }
          : q,
      ),
    );

  const setOptionText = (questionIndex: number, letter: string, text: string) =>
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === questionIndex
          ? { ...q, options: q.options.map((o) => (o.letter === letter ? { ...o, text } : o)) }
          : q,
      ),
    );

  const validate = (): string | null => {
    if (!title.trim()) return "Give the test a title.";
    if (!subject.trim()) return "Set the subject — it decides which classes this test gates.";
    for (const [i, q] of questions.entries()) {
      if (!q.question.trim()) return `Question ${i + 1} is empty.`;
      const filled = q.options.filter((o) => o.text.trim());
      if (filled.length < 2) return `Question ${i + 1} needs at least two options.`;
      if (!filled.some((o) => o.isCorrect)) return `Question ${i + 1} has no correct answer marked.`;
    }
    const usableBands = bands.filter((b) => b.levelCode.trim());
    if (isPublished && usableBands.length === 0) {
      return "Add at least one score band before publishing — without bands no level is ever assigned.";
    }
    for (const b of usableBands) {
      if (b.minScore > b.maxScore) return `Band ${b.levelCode} has a minimum above its maximum.`;
    }
    const sorted = [...usableBands].sort((a, b) => a.minScore - b.minScore);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].minScore <= sorted[i - 1].maxScore) {
        return `Bands ${sorted[i - 1].levelCode} and ${sorted[i].levelCode} overlap — each score must map to exactly one level.`;
      }
    }
    return null;
  };

  const handleSave = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");

    const payload: PlacementTestUpsertRequest = {
      title: title.trim(),
      description: description.trim() || undefined,
      subject: subject.trim(),
      timeLimitMinutes: timeLimitMinutes === "" ? undefined : Number(timeLimitMinutes),
      passingScore: passingScore === "" ? undefined : Number(passingScore),
      maxAttempts: maxAttempts === "" ? undefined : Number(maxAttempts),
      isPublished,
      questions: questions.map((q, idx) => ({
        question: q.question.trim(),
        imageUrl: q.imageUrl?.trim() || undefined,
        explanation: q.explanation?.trim() || undefined,
        orderIndex: idx,
        points: q.points ?? 10,
        options: q.options
          .filter((o) => o.text.trim())
          .map((o) => ({ letter: o.letter, text: o.text.trim(), isCorrect: o.isCorrect })),
      })),
      bands: bands
        .filter((b) => b.levelCode.trim())
        .map((b) => ({ minScore: b.minScore, maxScore: b.maxScore, levelCode: b.levelCode.trim() })),
    };

    try {
      setSaving(true);
      if (existing) {
        await eduhubPlacementTestsAdmin.update(existing.id, payload);
        toast.success("Placement test updated");
      } else {
        await eduhubPlacementTestsAdmin.create(payload);
        toast.success("Placement test created");
      }
      onSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not save the placement test.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-slate-900">Test details</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="pt-title">Title</Label>
            <Input
              id="pt-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Russian Placement Test"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pt-subject">Subject</Label>
            <Input
              id="pt-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Russian"
            />
            <p className="text-xs text-slate-500">
              Must match the subject on the classes this test should gate.
            </p>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="pt-description">Description</Label>
            <Textarea
              id="pt-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pt-time">Time limit (minutes)</Label>
            <Input
              id="pt-time"
              type="number"
              min={1}
              value={timeLimitMinutes}
              onChange={(e) => setTimeLimitMinutes(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pt-passing">Passing score</Label>
            <Input
              id="pt-passing"
              type="number"
              min={0}
              max={100}
              value={passingScore}
              onChange={(e) => setPassingScore(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pt-attempts">Attempts allowed</Label>
            <Input
              id="pt-attempts"
              type="number"
              min={1}
              max={20}
              value={maxAttempts}
              onChange={(e) => setMaxAttempts(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="Leave empty for unlimited"
            />
            <p className="text-xs text-slate-500">
              A student's best result counts; a weaker retake never lowers their level.
            </p>
          </div>
          <div className="flex items-center gap-3 pt-6">
            <Switch id="pt-published" checked={isPublished} onCheckedChange={setIsPublished} />
            <Label htmlFor="pt-published" className="cursor-pointer">
              Published
            </Label>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Only one published test per subject is allowed, so students cannot pick the easiest one.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Score bands</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setBands((prev) => [...prev, { minScore: 0, maxScore: 100, levelCode: "" }])}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add band
          </Button>
        </div>
        <p className="mb-3 text-xs text-slate-500">
          Maps a score onto the level a student qualifies for. Ranges must not overlap.
        </p>
        <div className="space-y-2">
          {bands.map((band, idx) => (
            <div key={idx} className="flex flex-wrap items-center gap-2">
              <Input
                type="number"
                min={0}
                max={100}
                className="w-20"
                value={band.minScore}
                onChange={(e) =>
                  setBands((prev) =>
                    prev.map((b, i) => (i === idx ? { ...b, minScore: Number(e.target.value) } : b)),
                  )
                }
                aria-label="Minimum score"
              />
              <span className="text-slate-400">–</span>
              <Input
                type="number"
                min={0}
                max={100}
                className="w-20"
                value={band.maxScore}
                onChange={(e) =>
                  setBands((prev) =>
                    prev.map((b, i) => (i === idx ? { ...b, maxScore: Number(e.target.value) } : b)),
                  )
                }
                aria-label="Maximum score"
              />
              <span className="text-slate-500">→</span>
              <Select
                value={band.levelCode || undefined}
                onValueChange={(value) =>
                  setBands((prev) => prev.map((b, i) => (i === idx ? { ...b, levelCode: value } : b)))
                }
              >
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {levels.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-slate-500"
                onClick={() => setBands((prev) => prev.filter((_, i) => i !== idx))}
                aria-label="Remove band"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Questions</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setQuestions((prev) => [...prev, emptyQuestion()])}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add question
          </Button>
        </div>
        <div className="space-y-5">
          {questions.map((q, idx) => (
            <div key={idx} className="rounded-md border border-slate-200 p-4">
              <div className="mb-3 flex items-start gap-3">
                <span className="mt-2 text-xs font-medium text-slate-500">{idx + 1}.</span>
                <Input
                  value={q.question}
                  onChange={(e) => updateQuestion(idx, { question: e.target.value })}
                  placeholder="Question text"
                />
                {questions.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-slate-500"
                    onClick={() => setQuestions((prev) => prev.filter((_, i) => i !== idx))}
                    aria-label="Remove question"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
              <div className="space-y-2 pl-6">
                {q.options.map((option) => (
                  <div key={option.letter} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`correct-${idx}`}
                      checked={option.isCorrect}
                      onChange={() => setCorrectOption(idx, option.letter)}
                      aria-label={`Mark ${option.letter} correct`}
                    />
                    <span className="w-5 text-xs font-medium text-slate-500">{option.letter}</span>
                    <Input
                      value={option.text}
                      onChange={(e) => setOptionText(idx, option.letter, e.target.value)}
                      placeholder={`Option ${option.letter}`}
                    />
                  </div>
                ))}
                <p className="text-xs text-slate-500">
                  Select the radio button next to the correct answer. Blank options are ignored.
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {error ? (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      ) : null}

      <div className="flex items-center gap-2">
        <Button type="button" onClick={handleSave} disabled={saving} className="bg-slate-900 hover:bg-slate-800">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {existing ? "Save changes" : "Create placement test"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
