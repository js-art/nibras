'use client';

import * as React from 'react';
import type { ComponentType } from 'react';

export type DataTableRowAction =
  | {
      type: 'item';
      label: string;
      onClick: () => void;
      destructive?: boolean;
      icon?: ComponentType<{ className?: string }>;
    }
  | { type: 'separator' };

type RegisterFn = (actions: DataTableRowAction[]) => void;

const RegisterContext = React.createContext<RegisterFn | null>(null);
const ActionsContext = React.createContext<DataTableRowAction[]>([]);
const ActionsRefContext = React.createContext<React.MutableRefObject<DataTableRowAction[]> | null>(
  null,
);

function actionMetaKey(actions: DataTableRowAction[]) {
  return actions
    .map((action) =>
      action.type === 'separator'
        ? '|'
        : `${action.label}:${action.destructive ? '1' : '0'}`,
    )
    .join('~');
}

export function DataTableRowActionsProvider({ children }: { children: React.ReactNode }) {
  const [actions, setActions] = React.useState<DataTableRowAction[]>([]);
  const actionsRef = React.useRef<DataTableRowAction[]>([]);

  const register = React.useCallback<RegisterFn>((next) => {
    actionsRef.current = next;
    setActions((prev) => {
      if (actionMetaKey(prev) === actionMetaKey(next)) return prev;
      return next;
    });
  }, []);

  return (
    <RegisterContext.Provider value={register}>
      <ActionsRefContext.Provider value={actionsRef}>
        <ActionsContext.Provider value={actions}>{children}</ActionsContext.Provider>
      </ActionsRefContext.Provider>
    </RegisterContext.Provider>
  );
}

export function useRegisterDataTableRowActions() {
  return React.useContext(RegisterContext);
}

export function useDataTableRowActions() {
  return React.useContext(ActionsContext);
}

export function useDataTableRowActionsRef() {
  return React.useContext(ActionsRefContext);
}
