"use client";

import * as React from "react";
import * as DropdownPrimitive from "@radix-ui/react-dropdown-menu";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const menuSurface =
  "z-50 min-w-[10rem] overflow-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95";
const menuItem =
  "relative flex cursor-default select-none items-center gap-2 rounded-md px-2 py-1.5 text-[13px] outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:size-3.5 [&_svg]:shrink-0 [&_svg]:text-muted-foreground";

// ─── Dropdown ───────────────────────────────────────────────────────────────
export const DropdownMenu = DropdownPrimitive.Root;
export const DropdownMenuTrigger = DropdownPrimitive.Trigger;
export const DropdownMenuSub = DropdownPrimitive.Sub;
export const DropdownMenuGroup = DropdownPrimitive.Group;

export const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownPrimitive.Portal>
    <DropdownPrimitive.Content ref={ref} sideOffset={sideOffset} className={cn(menuSurface, className)} {...props} />
  </DropdownPrimitive.Portal>
));
DropdownMenuContent.displayName = "DropdownMenuContent";

export const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Item> & { destructive?: boolean }
>(({ className, destructive, ...props }, ref) => (
  <DropdownPrimitive.Item
    ref={ref}
    className={cn(menuItem, destructive && "text-destructive focus:bg-destructive/10 focus:text-destructive [&_svg]:text-destructive", className)}
    {...props}
  />
));
DropdownMenuItem.displayName = "DropdownMenuItem";

export function DropdownMenuLabel({ className, ...props }: React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Label>) {
  return <DropdownPrimitive.Label className={cn("px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground", className)} {...props} />;
}
export function DropdownMenuSeparator({ className }: { className?: string }) {
  return <DropdownPrimitive.Separator className={cn("-mx-1 my-1 h-px bg-border", className)} />;
}
export function DropdownMenuShortcut({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("ml-auto font-mono text-[10px] tracking-wide text-muted-foreground", className)} {...props} />;
}
export function DropdownMenuSubTrigger({ className, children, ...props }: React.ComponentPropsWithoutRef<typeof DropdownPrimitive.SubTrigger>) {
  return (
    <DropdownPrimitive.SubTrigger className={cn(menuItem, "data-[state=open]:bg-accent", className)} {...props}>
      {children}
      <ChevronRight className="ml-auto" />
    </DropdownPrimitive.SubTrigger>
  );
}
export function DropdownMenuSubContent({ className, ...props }: React.ComponentPropsWithoutRef<typeof DropdownPrimitive.SubContent>) {
  return (
    <DropdownPrimitive.Portal>
      <DropdownPrimitive.SubContent className={cn(menuSurface, "max-h-72 overflow-y-auto", className)} {...props} />
    </DropdownPrimitive.Portal>
  );
}
export function DropdownMenuCheckboxItem({ className, children, checked, ...props }: React.ComponentPropsWithoutRef<typeof DropdownPrimitive.CheckboxItem>) {
  return (
    <DropdownPrimitive.CheckboxItem className={cn(menuItem, "pl-7", className)} checked={checked} {...props}>
      <span className="absolute left-2 flex size-3.5 items-center justify-center">
        <DropdownPrimitive.ItemIndicator>
          <Check className="!text-foreground" />
        </DropdownPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownPrimitive.CheckboxItem>
  );
}

// ─── Tooltip ────────────────────────────────────────────────────────────────
export const TooltipProvider = TooltipPrimitive.Provider;

export function Tooltip({
  content,
  children,
  side = "top",
  shortcut,
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  shortcut?: string;
}) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          className="z-[60] flex items-center gap-2 rounded-md border border-border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-lg data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0"
        >
          {content}
          {shortcut && <span className="font-mono text-[10px] text-muted-foreground">{shortcut}</span>}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

// ─── Popover ────────────────────────────────────────────────────────────────
export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverClose = PopoverPrimitive.Close;
export const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "end", sideOffset = 6, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content ref={ref} align={align} sideOffset={sideOffset} className={cn(menuSurface, "w-72 p-0", className)} {...props} />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = "PopoverContent";

// ─── Switch / Checkbox ──────────────────────────────────────────────────────
export const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      "peer inline-flex h-[18px] w-8 shrink-0 items-center rounded-full border border-transparent transition-colors data-[state=checked]:bg-primary data-[state=unchecked]:bg-input disabled:opacity-50",
      className,
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb className="pointer-events-none block size-3.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[15px] data-[state=unchecked]:translate-x-0.5" />
  </SwitchPrimitive.Root>
));
Switch.displayName = "Switch";

export const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer flex size-3.5 shrink-0 items-center justify-center rounded-[4px] border border-muted-foreground/50 transition-colors data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground disabled:opacity-50",
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator>
      <Check className="size-3" strokeWidth={3} />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = "Checkbox";
