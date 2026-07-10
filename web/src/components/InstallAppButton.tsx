import { useInstallPrompt } from "../hooks/useInstallPrompt";

export function InstallAppButton({ className = "" }: { className?: string }) {
  const { canInstall, promptInstall } = useInstallPrompt();

  if (!canInstall) return null;

  return (
    <button
      onClick={promptInstall}
      className={
        className ||
        "rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold hover:bg-white/10"
      }
    >
      Baixar App
    </button>
  );
}
