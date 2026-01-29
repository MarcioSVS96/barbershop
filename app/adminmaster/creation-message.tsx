"use client"

import { useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

type CreationMessageProps = {
  title: string
  description?: string | null
}

function buildNextUrl(pathname: string, params: URLSearchParams) {
  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}

export function CreationMessage({ title, description }: CreationMessageProps) {
  const [open, setOpen] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const nextUrl = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("msg")
    return buildNextUrl(pathname, params)
  }, [pathname, searchParams])

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      router.replace(nextUrl, { scroll: false })
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}
