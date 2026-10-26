"use client";

import { useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { Field, Select } from "@/components/ui/controls";

export function Finder({
  labels,
  areas,
  projects,
  developers,
}: {
  labels: {
    city: string;
    area: string;
    project: string;
    developer: string;
    dubai: string;
    any: string;
    go: string;
  };
  areas: { id: string; name: string }[];
  projects: { id: string; name: string }[];
  developers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [area, setArea] = useState("");
  const [project, setProject] = useState("");
  const [developer, setDeveloper] = useState("");

  return (
    <form
      className="grid items-end gap-3 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]"
      onSubmit={(event) => {
        event.preventDefault();
        if (project) {
          router.push(`/projects/${project}`);
          return;
        }
        if (area) {
          router.push(`/areas/${area}`);
          return;
        }
        if (developer) {
          router.push(`/developers/${developer}`);
          return;
        }
        router.push("/projects");
      }}
    >
      <Field label={labels.city}>
        <Select value="dubai" onChange={() => undefined} options={[{ value: "dubai", label: labels.dubai }]} />
      </Field>
      <Field label={labels.area}>
        <Select
          value={area}
          onChange={setArea}
          placeholder={labels.any}
          options={[{ value: "", label: labels.any }, ...areas.map((item) => ({ value: item.id, label: item.name }))]}
        />
      </Field>
      <Field label={labels.project}>
        <Select
          value={project}
          onChange={setProject}
          placeholder={labels.any}
          options={[{ value: "", label: labels.any }, ...projects.map((item) => ({ value: item.id, label: item.name }))]}
        />
      </Field>
      <Field label={labels.developer}>
        <Select
          value={developer}
          onChange={setDeveloper}
          placeholder={labels.any}
          options={[{ value: "", label: labels.any }, ...developers.map((item) => ({ value: item.id, label: item.name }))]}
        />
      </Field>
      <button type="submit" className="h-13 rounded-lg bg-palm-deep px-5 text-sm font-semibold text-[#e7f2ec]">
        {labels.go}
      </button>
    </form>
  );
}
