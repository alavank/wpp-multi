import { useEffect, useState } from "react";
import { loadMediaObjectUrl } from "../../lib/apiClient";
import type { ApiMessage } from "../../hooks/useMessages";

export function MediaBubble({ message }: { message: ApiMessage }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!message.mediaId) return;
    let revoked = false;
    loadMediaObjectUrl(message.mediaId)
      .then((u) => {
        if (!revoked) setUrl(u);
      })
      .catch((e) => setError((e as Error).message));
    return () => {
      revoked = true;
      if (url) URL.revokeObjectURL(url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message.mediaId]);

  if (error) return <span className="opacity-60 text-sm">⚠ mídia indisponível</span>;
  if (!url) return <span className="loading loading-spinner loading-sm" />;

  switch (message.type) {
    case "IMAGE":
      return (
        <img
          src={url}
          alt={message.body ?? "imagem"}
          className="max-w-xs max-h-80 rounded"
        />
      );
    case "VIDEO":
      return <video src={url} controls className="max-w-xs max-h-80 rounded" />;
    case "INSTANT_VIDEO":
      return (
        <video
          src={url}
          controls
          className="rounded-full w-40 h-40 object-cover"
          aria-label="Vídeo instantâneo circular"
        />
      );
    case "AUDIO":
      return <audio src={url} controls className="max-w-xs" />;
    case "STICKER":
      return <img src={url} alt="sticker" className="w-32 h-32 object-contain" />;
    case "DOCUMENT":
    default:
      return (
        <a href={url} download className="link link-primary text-sm">
          📄 {message.body ?? "documento"}
        </a>
      );
  }
}
