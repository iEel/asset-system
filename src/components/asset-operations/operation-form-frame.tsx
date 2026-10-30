import type { ReactNode } from "react"
import Link from "next/link"
import { Button, buttonVariants } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { StickyFormFooter } from "@/components/ui/sticky-form-footer"
import { getPanelClasses } from "@/lib/design-system"
import { cn } from "@/lib/utils"

export type OperationFormFooter = { description: ReactNode; cancelHref: string; cancelLabel: string; submitLabel: string; busy: boolean; formId: string }
export type OperationFormFrameProps = {
  title: string
  description: ReactNode
  summary: ReactNode
  footer: OperationFormFooter
  /** The page's phone layout is its own steps (P1-R4): below lg the summary column and this bar are hidden. */
  phoneSteps?: boolean
  children: ReactNode
}

// The frame of ส่งมอบ, รับคืน and โอนย้าย (group 3 spec §5): the page header with no breadcrumb, the main panel and the
// summary column in the audit-round grid, and the save bar across both. The page's own form element wraps this frame
// (onSubmit first, then noValidate), so the bar stays inside the form after every field; the submit also names formId.
export function OperationFormFrame({ title, description, summary, footer, phoneSteps = false, children }: OperationFormFrameProps) {
  return (
    <div data-slot="operation-form-frame" className="mx-auto max-w-6xl">
      <PageHeader title={title} meta={description} className="mb-6" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div data-slot="operation-form-main" className={cn(getPanelClasses(), "grid min-w-0 content-start gap-8 p-4 sm:p-5")}>
          {children}
        </div>
        <div className={cn("min-w-0", phoneSteps && "max-lg:hidden")}>{summary}</div>
        <StickyFormFooter className={cn("lg:col-span-2", phoneSteps && "max-lg:hidden")} status={footer.description}>
          <Link href={footer.cancelHref} className={buttonVariants({ variant: "outline" })}>
            {footer.cancelLabel}
          </Link>
          <Button type="submit" form={footer.formId} busy={footer.busy}>
            {footer.submitLabel}
          </Button>
        </StickyFormFooter>
      </div>
    </div>
  )
}
