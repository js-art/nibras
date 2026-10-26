"use client";

import { useState } from "react";
import { Field, Input, Textarea } from "@/components/ui/controls";

export function LeadForm({
  projectId,
  labels,
}: {
  projectId: string;
  labels: {
    title: string;
    lede: string;
    name: string;
    email: string;
    budget: string;
    note: string;
    submit: string;
    done: string;
  };
}) {
  const [done, setDone] = useState(false);

  if (done) {
    return <p className="bg-palm/10 px-5 py-6 text-base leading-8 text-palm-deep">{labels.done}</p>;
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const key = "nibras-introductions";
        const current = JSON.parse(window.localStorage.getItem(key) || "[]") as unknown[];
        current.push({
          projectId,
          name: form.get("name"),
          email: form.get("email"),
          budget: form.get("budget"),
          note: form.get("note"),
          at: new Date().toISOString(),
        });
        window.localStorage.setItem(key, JSON.stringify(current));
        setDone(true);
      }}
    >
      <div>
        <h2 className="font-display text-3xl leading-[1.25]">{labels.title}</h2>
        <p className="mt-2 text-base leading-8 text-mist">{labels.lede}</p>
      </div>
      <Field label={labels.name}>
        <Input name="name" required autoComplete="name" />
      </Field>
      <Field label={labels.email}>
        <Input name="email" type="email" required autoComplete="email" />
      </Field>
      <Field label={labels.budget}>
        <Input name="budget" />
      </Field>
      <Field label={labels.note}>
        <Textarea name="note" rows={4} />
      </Field>
      <button type="submit" className="h-13 w-full rounded-lg bg-palm-deep text-sm font-semibold text-[#e7f2ec]">
        {labels.submit}
      </button>
    </form>
  );
}
