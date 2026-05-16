"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import { CheckmarkCircle02Icon, InformationCircleIcon, Alert02Icon, MultiplicationSignCircleIcon, Loading03Icon } from "@hugeicons/core-free-icons"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()
  const safeTopOffset = "calc(env(safe-area-inset-top, 0px) + 16px)"

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      offset={{ top: safeTopOffset, right: "16px", left: "16px", bottom: "16px" }}
      mobileOffset={{ top: safeTopOffset, right: "12px", left: "12px", bottom: "12px" }}
      icons={{
        success: (
          <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-4" />
        ),
        info: (
          <HugeiconsIcon icon={InformationCircleIcon} strokeWidth={2} className="size-4" />
        ),
        warning: (
          <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} className="size-4" />
        ),
        error: (
          <HugeiconsIcon icon={MultiplicationSignCircleIcon} strokeWidth={2} className="size-4" />
        ),
        loading: (
          <HugeiconsIcon icon={Loading03Icon} strokeWidth={2} className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "color-mix(in oklab, var(--popover) 72%, transparent)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "color-mix(in oklab, var(--border) 70%, transparent)",
          "--success-bg": "rgba(20, 83, 45, 0.56)",
          "--success-text": "#f0fdf4",
          "--success-border": "rgba(22, 101, 52, 0.65)",
          "--info-bg": "rgba(30, 58, 138, 0.56)",
          "--info-text": "#eff6ff",
          "--info-border": "rgba(29, 78, 216, 0.65)",
          "--warning-bg": "rgba(120, 53, 15, 0.56)",
          "--warning-text": "#fffbeb",
          "--warning-border": "rgba(146, 64, 14, 0.65)",
          "--error-bg": "rgba(127, 29, 29, 0.56)",
          "--error-text": "#fef2f2",
          "--error-border": "rgba(153, 27, 27, 0.65)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast text-popover-foreground",
          title: "text-current",
          description: "text-current/95",
          error: "!text-red-50",
          success: "!text-green-50",
          warning: "!text-amber-50",
          info: "!text-blue-50",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
