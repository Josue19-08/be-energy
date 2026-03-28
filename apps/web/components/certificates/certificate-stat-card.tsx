"use client";

import type { ReactNode } from "react";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import { cn } from "@/lib/utils";

interface CertificateStatCardProps {
  value: number | string;
  label: string;
  tooltip: string;
  icon: ReactNode;
  containerClassName: string;
  valueClassName: string;
  interactive?: boolean;
  isActive?: boolean;
  onClick?: () => void;
}

export function CertificateStatCard({
  value,
  label,
  tooltip,
  icon,
  containerClassName,
  valueClassName,
  interactive = false,
  isActive = false,
  onClick,
}: CertificateStatCardProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border p-3 transition-all",
        containerClassName,
        interactive && "hover:shadow-sm",
        interactive &&
          isActive &&
          "ring-2 ring-primary ring-offset-2 ring-offset-background",
      )}
    >
      {interactive ? (
        <button
          type="button"
          onClick={onClick}
          aria-pressed={isActive}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <div className="shrink-0">{icon}</div>
          <div className="min-w-0 flex-1">
            <p className={cn("text-lg font-bold", valueClassName)}>{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </button>
      ) : (
        <>
          <div className="shrink-0">{icon}</div>
          <div className="min-w-0 flex-1">
            <p className={cn("text-lg font-bold", valueClassName)}>{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </>
      )}

      <InfoTooltip text={tooltip} />
    </div>
  );
}
