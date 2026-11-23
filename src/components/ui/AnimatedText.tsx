import { useOptionalThemeContext } from "../../theme";
import { cn } from "../../utils/cn";

export interface AnimatedTextSwapProps {
  readonly text: string;
  readonly className?: string;
}

/**
 * Komponen teks anti-hardcut & anti-flicker (120 FPS):
 * - Memakai 1 DOM node tunggal ber-key `{text}` + animasi GPU (`opacity` + `translate3d`) 180ms
 *   sehingga perubahan bahasa/label selalu mulus tanpa duplikasi node atau jeda reflow.
 */
export function AnimatedTextSwap({ text, className }: AnimatedTextSwapProps) {
  const themeCtx = useOptionalThemeContext();
  const useGpuFlip =
    themeCtx?.uiMode !== "anti-slop" && (themeCtx?.motionEngine ?? "gpu_flip") === "gpu_flip";

  return (
    <span
      key={useGpuFlip ? text : undefined}
      className={cn(
        "inline-block whitespace-nowrap",
        useGpuFlip && "gpu-text-crossfade",
        className,
      )}
    >
      {text}
    </span>
  );
}
