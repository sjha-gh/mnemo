"use client"

import { ImagePlus, X } from "lucide-react"
import { useRef } from "react"
import type { ImageMemory } from "@/lib/types"

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function ImageAttachments({
  images,
  onAdd,
  onRemove,
}: {
  images: ImageMemory[]
  onAdd: (image: ImageMemory) => void
  onRemove: (id: string) => void
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)

  async function handleFiles(files: FileList | null) {
    if (!files) return
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue
      const url = await readFileAsDataUrl(file)
      onAdd({
        id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        url,
        alt: file.name.replace(/\.[^.]+$/, ""),
      })
    }
    if (inputRef.current) inputRef.current.value = ""
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Images</h3>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary/70"
        >
          <ImagePlus className="size-3.5" />
          Add image
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((image) => (
            <div
              key={image.id}
              className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted"
            >
              <img src={image.url || "/placeholder.svg"} alt={image.alt} className="size-full object-cover" />
              <button
                type="button"
                onClick={() => onRemove(image.id)}
                className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-background/80 text-foreground opacity-0 backdrop-blur transition-opacity group-hover:opacity-100"
                aria-label="Remove image"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
