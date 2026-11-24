import type { localizationPages } from "@/lib/decision-journey/video-localization";

type Stage = (typeof localizationPages)[number]["type"];

export function LocalizationDiagram({ stage }: { stage: Stage }) {
  return (
    <svg viewBox="0 0 240 116" className="stage-diagram" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" focusable="false">
      {stage === "Decision Hub" && (
        <>
          <rect x="5" y="8" width="230" height="100" />
          {[28, 58, 88].map((y, channel) => (
            <g key={y}>
              <path d={`M12 ${y}h216`} opacity=".36" />
              {Array.from({ length: 94 }, (_, sample) => {
                const envelope = Math.abs(Math.sin(sample * .11 + channel) * Math.cos(sample * .29));
                const height = 1 + envelope * (4 + Math.abs(Math.sin(sample * 3.71)) * 12);
                const x = 13 + sample * 2.3;
                return <path key={sample} d={`M${x} ${y - height}v${height * 2}`} />;
              })}
            </g>
          ))}
        </>
      )}
      {stage === "Solution Hub" && (
        <>
          <rect x="3" y="17" width="188" height="40" /><rect x="42" y="64" width="195" height="38" />
          <path strokeWidth="3" d="M15 31h72m8 0h79M15 43h113M54 78h92m8 0h68M54 90h122" />
        </>
      )}
      {stage === "Decision Scenario" && (
        <>
          <rect x="5" y="8" width="230" height="100" />
          <path d="M110 35l25 16-25 16z" fill="currentColor" stroke="none" />
          <path d="M18 91h204" opacity=".5" /><path d="M18 91h122" stroke="#f3b24e" strokeWidth="3" />
          <circle cx="140" cy="91" r="5" fill="#f3b24e" />
        </>
      )}
    </svg>
  );
}
