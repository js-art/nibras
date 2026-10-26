"use client";

import { useMemo, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { useLocale, useTranslations } from "next-intl";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { DeskSidebar } from "@/components/admin/desk-sidebar";
import { FieldHint, SectionHint } from "@/components/admin/hint-label";
import { Button } from "@/components/ui/button";
import { controlClass } from "@/components/ui/controls";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatDeskDate } from "@/lib/format-desk-date";
import { useClientDataTable } from "@/lib/hooks/use-client-data-table";
import type { DataTableFilterField } from "@/types";

type DeskUser = {
  id: string;
  username: string;
  displayName: string;
  createdAt: string;
};

const fieldClass = controlClass;

export function UsersDesk({
  initial,
  currentUserId,
}: {
  initial: DeskUser[];
  currentUserId: string;
}) {
  const t = useTranslations("admin");
  const locale = useLocale();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const [users, setUsers] = useState<DeskUser[]>(initial);
  const [status, setStatus] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [resetId, setResetId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetError, setResetError] = useState("");

  async function refresh() {
    const response = await fetch("/api/admin/users");
    if (!response.ok) return;
    setUsers((await response.json()) as DeskUser[]);
  }

  async function addUser() {
    const errors: Record<string, string> = {};
    if (username.trim().length < 2) errors.username = t("usernameInvalid");
    if (!displayName.trim()) errors.displayName = t("needDisplayName");
    if (password.length < 8) errors.password = t("needPassword");
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setStatus(t("formInvalid"));
      return;
    }
    setStatus(t("saving"));
    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, displayName, password }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      const message = errorMessage(body.error, t);
      setStatus(message);
      if (body.error === "username" || body.error === "taken") setFieldErrors({ username: message });
      else if (body.error === "password") setFieldErrors({ password: message });
      return;
    }
    setUsername("");
    setDisplayName("");
    setPassword("");
    setFieldErrors({});
    setStatus(t("saved"));
    await refresh();
  }

  async function changePassword(id: string) {
    if (resetPassword.length < 8) {
      setResetError(t("needPassword"));
      setStatus(t("formInvalid"));
      return;
    }
    setResetError("");
    setStatus(t("saving"));
    const response = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: resetPassword }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      const message = errorMessage(body.error, t);
      setStatus(message);
      setResetError(message);
      return;
    }
    setResetId(null);
    setResetPassword("");
    setResetError("");
    setStatus(t("saved"));
  }

  async function removeUser(id: string) {
    const ok = await confirm({
      title: t("deleteUserConfirmTitle"),
      description: t("deleteUserConfirm"),
      confirmLabel: t("deleteUserConfirmAction"),
      tone: "danger",
    });
    if (!ok) return;
    setStatus(t("saving"));
    const response = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setStatus(errorMessage(body.error, t));
      return;
    }
    setStatus(t("saved"));
    await refresh();
  }

  const columns = useMemo<ColumnDef<DeskUser>[]>(
    () => [
      {
        accessorKey: "displayName",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("displayName")} />,
        cell: ({ row }) => (
          <div>
            <p className="font-medium">
              {row.original.displayName}
              {row.original.id === currentUserId ? (
                <span className="ms-2 text-xs font-normal text-muted-foreground">({t("you")})</span>
              ) : null}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "username",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("username")} />,
        cell: ({ row }) => (
          <span dir="ltr" className="text-muted-foreground">
            @{row.original.username}
          </span>
        ),
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("recordedAt")} />,
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-muted-foreground tabular-nums">
            {formatDeskDate(row.original.createdAt, locale)}
          </span>
        ),
        sortingFn: (a, b) =>
          new Date(a.original.createdAt).getTime() - new Date(b.original.createdAt).getTime(),
      },
      {
        id: "actions",
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => {
          const user = row.original;
          return (
            <div className="flex flex-col items-end gap-2">
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setResetId(user.id);
                    setResetPassword("");
                    setResetError("");
                  }}
                >
                  {t("resetPassword")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  disabled={user.id === currentUserId || users.length <= 1}
                  onClick={() => void removeUser(user.id)}
                >
                  {t("delete")}
                </Button>
              </div>
              {resetId === user.id ? (
                <div className="grid w-full max-w-xs gap-2 rounded-lg border border-border p-3">
                  <FieldHint label={t("newPassword")} hint={t("passwordHintField")} error={resetError}>
                    <input
                      className={fieldClass}
                      type="password"
                      value={resetPassword}
                      placeholder={t("newPassword")}
                      onChange={(event) => {
                        setResetError("");
                        setResetPassword(event.target.value);
                      }}
                      autoComplete="new-password"
                    />
                  </FieldHint>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" onClick={() => void changePassword(user.id)}>
                      {t("save")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setResetId(null);
                        setResetPassword("");
                        setResetError("");
                      }}
                    >
                      {t("cancel")}
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          );
        },
      },
    ],
    [currentUserId, locale, resetError, resetId, resetPassword, t, users.length],
  );

  const filterFields = useMemo<DataTableFilterField<DeskUser>[]>(
    () => [
      { label: t("username"), value: "username", placeholder: t("search") },
      { label: t("displayName"), value: "displayName", placeholder: t("search") },
    ],
    [t],
  );

  const sortedUsers = useMemo(
    () =>
      [...users].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [users],
  );

  const { table } = useClientDataTable({
    data: sortedUsers,
    columns,
    filterFields,
    initialPageSize: 10,
    initialSorting: [{ id: "createdAt", desc: true }],
  });

  return (
    <div className="flex h-full min-h-0 bg-paper">
      {confirmDialog}
      <DeskSidebar desk="users" />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-ink/10 px-6 py-4">
          <p className="text-sm text-mist">{status || t("usersLede")}</p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <div className="mx-auto grid max-w-4xl gap-8">
            <section className="grid gap-3 rounded-2xl border border-[#d5dfd8] bg-white p-4 shadow-[0_12px_28px_-24px_rgba(6,36,33,0.45)]">
              <SectionHint title={t("addUser")} hint={t("addUserHint")} />
              <FieldHint label={t("username")} hint={t("usernameHint")} error={fieldErrors.username}>
                <input
                  className={fieldClass}
                  value={username}
                  onChange={(event) => {
                    setFieldErrors((current) => {
                      if (!current.username) return current;
                      const next = { ...current };
                      delete next.username;
                      return next;
                    });
                    setUsername(event.target.value);
                  }}
                  autoComplete="off"
                />
              </FieldHint>
              <FieldHint label={t("displayName")} hint={t("displayNameHint")} error={fieldErrors.displayName}>
                <input
                  className={fieldClass}
                  value={displayName}
                  onChange={(event) => {
                    setFieldErrors((current) => {
                      if (!current.displayName) return current;
                      const next = { ...current };
                      delete next.displayName;
                      return next;
                    });
                    setDisplayName(event.target.value);
                  }}
                />
              </FieldHint>
              <FieldHint label={t("password")} hint={t("passwordHintField")} error={fieldErrors.password}>
                <input
                  className={fieldClass}
                  type="password"
                  value={password}
                  onChange={(event) => {
                    setFieldErrors((current) => {
                      if (!current.password) return current;
                      const next = { ...current };
                      delete next.password;
                      return next;
                    });
                    setPassword(event.target.value);
                  }}
                  autoComplete="new-password"
                />
              </FieldHint>
              <Button
                type="button"
                onClick={() => void addUser()}
                className="bg-palm-deep text-[#e7f2ec] hover:bg-palm-deep/90"
              >
                {t("add")}
              </Button>
            </section>

            <section className="grid gap-3">
              <SectionHint title={t("usersList")} hint={t("usersListHint")} />
              <DataTable table={table}>
                <DataTableToolbar table={table} filterFields={filterFields} />
              </DataTable>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function errorMessage(code: string | undefined, t: (key: string) => string) {
  if (code === "taken") return t("usernameTaken");
  if (code === "password") return t("passwordHint");
  if (code === "username") return t("usernameInvalid");
  if (code === "self") return t("cannotDeleteSelf");
  if (code === "last") return t("cannotDeleteLast");
  return t("error");
}
