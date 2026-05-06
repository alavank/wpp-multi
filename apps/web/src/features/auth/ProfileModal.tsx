import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../../lib/apiClient";
import { uploadAvatar } from "../../lib/avatarUpload";
import { useAuthStore } from "../../stores/authStore";
import { Avatar } from "../../components/Avatar";

type Me = {
  id: string;
  email: string;
  fullName: string;
  photoUrl: string | null;
  bio: string | null;
  cpf: string | null;
};

export function ProfileModal({ onClose }: { onClose: () => void }) {
  const sessionUser = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    let alive = true;
    apiFetch<Me>("/users/me")
      .then((data) => {
        if (!alive) return;
        setMe(data);
        setFullName(data.fullName);
        setBio(data.bio ?? "");
      })
      .catch((e) => alive && setError((e as Error).message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setPhotoFile(f);
    if (f) {
      const reader = new FileReader();
      reader.onload = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(f);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!me || !sessionUser) return;
    setSaving(true);
    setError(null);
    try {
      let photoUrl = me.photoUrl;
      if (photoFile) {
        photoUrl = await uploadAvatar(me.id, photoFile);
      }
      await apiFetch("/users/me", {
        method: "PATCH",
        body: JSON.stringify({ fullName, bio: bio || null }),
      });
      // Atualiza store (sidebar etc.)
      setUser({ ...sessionUser, fullName, photoUrl: photoUrl ?? undefined });
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in-up"
      onClick={onClose}
    >
      <div
        className="surface-card p-6 w-full max-w-md max-h-[90vh] overflow-y-auto scrollbar-soft animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {loading || !me ? (
          <div className="grid place-items-center py-10">
            <span className="loading loading-dots text-primary" />
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSave}>
            <div>
              <h3 className="text-lg font-bold">Meu perfil</h3>
              <p className="text-sm text-base-content/60">
                Atualize sua foto, nome e bio.
              </p>
            </div>

            <div className="flex items-center gap-4">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="prévia"
                  className="w-16 h-16 rounded-2xl object-cover"
                />
              ) : (
                <Avatar
                  name={me.fullName}
                  src={me.photoUrl ?? undefined}
                  sizeClass="w-16"
                />
              )}
              <div className="flex-1">
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFile}
                />
                <button
                  type="button"
                  className="btn-flat-neutral"
                  onClick={() => fileInput.current?.click()}
                >
                  {photoFile ? "Trocar foto" : "Carregar foto"}
                </button>
                <p className="text-[11px] text-base-content/50 mt-1">
                  Será redimensionada para 300×300.
                </p>
              </div>
            </div>

            <label className="block">
              <span className="block text-xs font-semibold text-base-content/70 mb-1.5">
                Nome completo
              </span>
              <input
                className="input-flat"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </label>

            <label className="block">
              <span className="block text-xs font-semibold text-base-content/70 mb-1.5">
                Bio (opcional)
              </span>
              <textarea
                className="input-flat resize-none"
                rows={3}
                maxLength={500}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Conte um pouco sobre você…"
              />
            </label>

            <div className="text-xs text-base-content/55 bg-base-200 rounded-2xl px-3 py-2">
              <div>
                <strong>E-mail:</strong> {me.email}
              </div>
              {me.cpf && (
                <div>
                  <strong>CPF:</strong> {me.cpf}
                </div>
              )}
            </div>

            {error && (
              <div role="alert" className="text-sm text-error bg-error/10 rounded-2xl px-4 py-3">
                {error}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button type="button" className="btn-flat-neutral flex-1" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="btn-flat-primary flex-1" disabled={saving}>
                {saving ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
