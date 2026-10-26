'use client';

import * as React from 'react';
import type { ComponentType } from 'react';
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { DataTableDropdownMenuItem } from '@/components/data-table/data-table-dropdown-menu-item';
import {
  useRegisterDataTableRowActions,
  type DataTableRowAction,
} from '@/components/data-table/data-table-row-actions-context';

function textFromNode(node: React.ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textFromNode).join('').trim();
  if (React.isValidElement(node)) {
    return textFromNode((node.props as { children?: React.ReactNode }).children);
  }
  return '';
}

function collectRowActions(children: React.ReactNode): DataTableRowAction[] {
  const actions: DataTableRowAction[] = [];

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;

    if (child.type === DataTableDropdownMenuItem) {
      const itemProps = child.props as React.ComponentProps<typeof DataTableDropdownMenuItem>;
      actions.push({
        type: 'item',
        label: itemProps.label,
        onClick: itemProps.onClick,
        destructive: itemProps.destructive,
        icon: itemProps.icon,
      });
      return;
    }

    const props = child.props as Record<string, unknown>;
    if (
      typeof props?.label === 'string' &&
      typeof props?.onClick === 'function' &&
      child.type !== DropdownMenuItem
    ) {
      actions.push({
        type: 'item',
        label: props.label,
        onClick: props.onClick as () => void,
        destructive: Boolean(props.destructive),
        icon: props.icon as ComponentType<{ className?: string }> | undefined,
      });
      return;
    }

    if (child.type === DropdownMenuItem) {
      const itemProps = child.props as React.ComponentProps<typeof DropdownMenuItem> & {
        onClick?: () => void;
        className?: string;
      };
      if (typeof itemProps.onClick === 'function') {
        const label = textFromNode(itemProps.children).trim();
        if (label) {
          actions.push({
            type: 'item',
            label,
            onClick: itemProps.onClick,
            destructive: String(itemProps.className || '').includes('text-red'),
          });
        }
      }
      return;
    }

    if (child.type === DropdownMenuSeparator) {
      actions.push({ type: 'separator' });
      return;
    }

    const nested = (child.props as { children?: React.ReactNode })?.children;
    if (nested) {
      actions.push(...collectRowActions(nested));
    }
  });

  return actions;
}

type ContentProps = React.ComponentProps<typeof DropdownMenuContent>;

/**
 * Dropdown content that registers actions for row right-click.
 * Does not use forceMount (that prevented the trigger from opening the menu).
 */
export function DataTableActionsContent({ className, children, ...props }: ContentProps) {
  const register = useRegisterDataTableRowActions();
  const actions = React.useMemo(() => collectRowActions(children), [children]);
  const actionsKey = React.useMemo(
    () =>
      actions
        .map((action) =>
          action.type === 'separator' ? '|' : `${action.label}:${action.destructive ? '1' : '0'}`,
        )
        .join('~'),
    [actions],
  );

  React.useEffect(() => {
    if (!register) return;
    register(actions);
    return () => register([]);
  }, [register, actions, actionsKey]);

  return (
    <DropdownMenuContent {...props} className={cn(className)}>
      {children}
    </DropdownMenuContent>
  );
}
