import { toast } from '@/components/ui/sonner'
import { removePhoto, setPhoto, type Photo } from '@/data'

/** A photo chosen in a Dialog, kept on Save or Done. */
export type PhotoChoice =
  { blob: Blob; width: number; height: number; url: string } | 'remove' | null

/** Keeps what was chosen for an Item's photo (RCP-006 3); says so if it can't. */
export function keepPhoto(item: string, choice: PhotoChoice, old: Photo | undefined) {
  if (choice === 'remove') {
    if (old) removePhoto(item, old)
  } else if (choice) {
    // Offline it would wait in memory and could be lost unseen: said now.
    if (!navigator.onLine) {
      toast('Couldn’t keep the photo. It needs a connection; try again')
      return
    }
    setPhoto(item, choice, old).catch(() =>
      toast('Couldn’t keep the photo. It needs a connection; try again'),
    )
  }
}
