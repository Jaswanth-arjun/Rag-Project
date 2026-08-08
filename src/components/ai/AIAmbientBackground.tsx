"use client";

type AIAmbientBackgroundProps = {
  active: boolean;
  isGenerating: boolean;
  isVoiceActive: boolean;
};

export function AIAmbientBackground({
  active,
  isGenerating,
  isVoiceActive,
}: AIAmbientBackgroundProps) {
  const stateClasses = [
    "ai-ambient-background",
    active && "is-active",
    isGenerating && "is-generating",
    isVoiceActive && "is-voice-active",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={stateClasses} aria-hidden="true">
      <span className="ai-ambient-background__glow ai-ambient-background__glow--primary" />
      <span className="ai-ambient-background__glow ai-ambient-background__glow--accent" />
      <span className="ai-ambient-background__glow ai-ambient-background__glow--base" />
      <span className="ai-ambient-background__smoke" />
    </div>
  );
}
