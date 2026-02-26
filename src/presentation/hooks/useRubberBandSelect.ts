import { useRef, useState, useCallback } from "react";
import { Track } from "../../domain/entities/Track";

export interface SelectionRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * コンテナ上でのマウスドラッグによるラバーバンド（範囲）選択フック。
 * 各トラック要素に `data-track-path={absolutePath}` が付いていることが前提。
 */
export function useRubberBandSelect(
  containerRef: React.RefObject<HTMLElement | null>,
  flatTracks: Track[],
  onSelect: (tracks: Track[]) => void,
) {
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const didDragRef = useRef(false);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      // 左ボタンのみ
      if (e.button !== 0) return;

      const target = e.target as Element;
      // インタラクティブな子要素の上とトラック行上では開始しない
      if (
        target.closest("button") ||
        target.closest("[data-track-path]") ||
        target.closest(".library-folder-header")
      ) return;

      const container = containerRef.current;
      if (!container) return;

      // テキスト選択を防ぐ
      e.preventDefault();
      document.body.style.userSelect = "none";

      startRef.current = { x: e.clientX, y: e.clientY };
      didDragRef.current = false;
      setSelectionRect(null);

      const handleMouseMove = (me: MouseEvent) => {
        const start = startRef.current;
        if (!start) return;

        const left = Math.min(start.x, me.clientX);
        const top = Math.min(start.y, me.clientY);
        const width = Math.abs(me.clientX - start.x);
        const height = Math.abs(me.clientY - start.y);

        // 最小移動距離以下はまだ描画しない（誤発動防止）
        if (width < 4 && height < 4) return;

        didDragRef.current = true;
        setSelectionRect({ left, top, width, height });

        // コンテナ内の全トラック要素と交差判定（viewport座標）
        const elements = container.querySelectorAll<HTMLElement>("[data-track-path]");
        const selRight = left + width;
        const selBottom = top + height;

        const selectedPaths = new Set<string>();
        elements.forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.right > left && r.left < selRight && r.bottom > top && r.top < selBottom) {
            const path = el.getAttribute("data-track-path");
            if (path) selectedPaths.add(path);
          }
        });

        if (selectedPaths.size > 0) {
          const selected = flatTracks.filter((t) => selectedPaths.has(t.absolutePath));
          onSelect(selected);
        }
      };

      const handleMouseUp = () => {
        startRef.current = null;
        setSelectionRect(null);
        document.body.style.userSelect = "";
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);

        // ドラッグが実際に行われた場合、直後の click イベントを一度だけ抑制する
        // （コンテナの onClick deselect が誤発火するのを防ぐ）
        if (didDragRef.current) {
          const suppressClick = (ce: MouseEvent) => ce.stopPropagation();
          document.addEventListener("click", suppressClick, { capture: true, once: true });
        }
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [containerRef, flatTracks, onSelect],
  );

  return { selectionRect, handleMouseDown };
}
