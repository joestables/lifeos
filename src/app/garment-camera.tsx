import { ImageIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { CameraView, PhotoCrop } from '@/components/lifeos'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/sonner'
import { clampCrop, CENTRED, keepSquare, type Crop } from '@/lib/garment-photo'
import type { Estimate } from '@lifeos/wardrobe'
import { cn } from '@/lib/utils'

/**
 * A garment's photo as taken and squared (WRD-005 2), with its colour read
 * (WRD-006 1): `url` a small preview at once, `blob` the photo kept, being
 * made while the sheet is filled in.
 */
export interface TakenPhoto {
  blob: Promise<Blob>
  width: number
  height: number
  url: string
  estimate: Estimate
}

/** The largest a picture is held while it is squared: more than is kept, so zooming stays sharp. */
const HELD = 2400

/**
 * A picture to square, from a file or the camera's frame as it is now:
 * read straight into memory, never made a file first, so it shows at
 * once (Joe, 20 November: the shutter took 20 seconds encoding twice).
 */
async function pictureOf(source: Blob | HTMLVideoElement): Promise<ImageBitmap> {
  const whole =
    source instanceof Blob
      ? await createImageBitmap(source, { imageOrientation: 'from-image' })
      : await createImageBitmap(source)
  const k = HELD / Math.max(whole.width, whole.height)
  if (k >= 1) return whole
  try {
    return await createImageBitmap(whole, {
      resizeWidth: Math.round(whole.width * k),
      resizeHeight: Math.round(whole.height * k),
      resizeQuality: 'high',
    })
  } finally {
    whole.close()
  }
}

/** A transparent pixel: the camera's video has no poster to show. */
const BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

type Torch = MediaTrackCapabilities & { torch?: boolean }

/**
 * The live camera (WRD-005 1): the back camera, as large as it gives; its
 * flash where it has a torch. Fails quietly: `failed` says to choose a
 * photo instead.
 */
function useCamera(on: boolean) {
  const video = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [failed, setFailed] = useState(false)
  const [torch, setTorch] = useState<boolean | null>(null)
  useEffect(() => {
    if (!on) return
    let live: MediaStream | null = null
    let stopped = false
    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('No camera')
        live = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1920 } },
          audio: false,
        })
        if (stopped) return live.getTracks().forEach((t) => t.stop())
        const track = live.getVideoTracks()[0]
        const caps = (track?.getCapabilities?.() ?? {}) as Torch
        setTorch(caps.torch ? false : null)
        setStream(live)
      } catch {
        if (!stopped) setFailed(true)
      }
    }
    void start()
    return () => {
      stopped = true
      live?.getTracks().forEach((t) => t.stop())
      setStream(null)
    }
  }, [on])
  // Ready once a frame has come, so the shutter never takes nothing.
  const [playing, setPlaying] = useState(false)
  useEffect(() => {
    const v = video.current
    if (!v || !stream) return
    const onData = () => setPlaying(true)
    v.addEventListener('loadeddata', onData)
    v.srcObject = stream
    void v.play().catch(() => undefined)
    return () => {
      v.removeEventListener('loadeddata', onData)
      setPlaying(false)
    }
  }, [stream])
  const toggleTorch = () => {
    const track = stream?.getVideoTracks()[0]
    if (!track || torch === null) return
    const next = !torch
    void track
      .applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] })
      .then(() => setTorch(next))
      .catch(() => setTorch(null))
  }
  /** The frame as it is now. */
  const shoot = async (): Promise<ImageBitmap | null> => {
    const v = video.current
    if (!v || !v.videoWidth) return null
    return pictureOf(v)
  }
  return { video, ready: stream !== null && playing, failed, torch, toggleTorch, shoot }
}

/**
 * Taking a garment's photo (WRD-005 1–2): the camera, or a file chosen
 * (`file`, a computer's Choose file, or where there's no camera), then its
 * square, moved and zoomed; Skip goes on without one.
 */
export function GarmentPhotoStep({
  file,
  last,
  onTaken,
  onSkip,
  onClose,
}: {
  /** A file already chosen: straight to its square. */
  file?: Blob
  last?: string
  onTaken: (photo: TakenPhoto) => void
  onSkip: () => void
  onClose: () => void
}) {
  const [picture, setPicture] = useState<ImageBitmap | null>(null)
  const [crop, setCrop] = useState<Crop>(CENTRED)
  const [busy, setBusy] = useState(false)
  const { video, ready, failed, torch, toggleTorch, shoot } = useCamera(!picture && !file)
  const input = useRef<HTMLInputElement>(null)

  const square = async (source: Blob | Promise<ImageBitmap | null>) => {
    try {
      const p = source instanceof Blob ? await pictureOf(source) : await source
      if (!p) return
      setCrop(CENTRED)
      setPicture(p)
    } catch {
      toast('This photo can’t be read')
    }
  }
  useEffect(() => {
    if (!file) return
    let alive = true
    pictureOf(file).then(
      (p) => {
        if (!alive) return
        setCrop(CENTRED)
        setPicture(p)
      },
      () => toast('This photo can’t be read'),
    )
    return () => {
      alive = false
    }
  }, [file])
  useEffect(() => () => picture?.close(), [picture])

  const use = async () => {
    if (!picture) return
    setBusy(true)
    try {
      const kept = await keepSquare(picture, crop)
      onTaken({
        blob: kept.photo,
        width: kept.width,
        height: kept.height,
        estimate: kept.estimate,
        url: URL.createObjectURL(kept.preview),
      })
    } catch {
      toast('This photo can’t be read')
    } finally {
      setBusy(false)
    }
  }

  const choose = (
    <input
      ref={input}
      type="file"
      accept="image/*"
      className="sr-only"
      aria-label="Choose a photo"
      onChange={(e) => {
        const f = e.target.files?.[0]
        e.target.value = ''
        if (f) void square(f)
      }}
    />
  )

  if (picture)
    return (
      <PhotoCrop
        src={picture}
        width={picture.width}
        height={picture.height}
        crop={crop}
        onCrop={(c) => setCrop(clampCrop(picture.width, picture.height, c))}
        onRetake={() => {
          if (file) return onClose()
          setPicture(null)
        }}
        onUse={() => void use()}
        busy={busy}
      />
    )
  if (file) return null
  return (
    <CameraView
      last={last}
      busy={!ready}
      onClose={onClose}
      onSkip={onSkip}
      onShoot={() => void square(shoot())}
      {...(torch !== null && { flash: { on: torch, onToggle: toggleTorch } })}
    >
      {failed ? (
        <div className="absolute inset-0 grid place-items-center">
          <div className="relative z-10 flex flex-col items-center gap-3">
            <ImageIcon aria-hidden className="size-8 text-muted-foreground" />
            <span className="text-sm font-semibold">No camera here</span>
            <Button variant="outline" onClick={() => input.current?.click()}>
              Choose a photo
            </Button>
          </div>
        </div>
      ) : (
        <video
          ref={video}
          playsInline
          muted
          aria-label="Camera"
          // Android's WebView draws a large grey play button on a video with
          // no frame yet: a blank poster, and the video shown once it plays.
          poster={BLANK}
          className={cn('absolute inset-0 size-full object-cover', !ready && 'opacity-0')}
        />
      )}
      {choose}
    </CameraView>
  )
}
