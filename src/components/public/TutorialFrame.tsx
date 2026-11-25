import Image from "next/image";

export function TutorialFrame({ stage }: { stage: number }) {
  return (
    <div className="tutorial-frame" data-stage={stage} role="img"
      aria-label={stage === 0 ? "A folded red paper sculpture in a crop preview. Caption: Preview the crop." :
        stage === 1 ? "The same crop preview with the Spanish caption: Previsualiza el recorte." :
        "The translated crop tutorial shown within the full player."}>
      <div className="tutorial-editor" aria-hidden="true">
        <div className="tutorial-toolbar">Crop preview</div>
        <div className="tutorial-photo">
          <Image src="/home-folios/paper-study.webp" alt="" width={1200} height={800} sizes="(max-width: 800px) 94vw, 55vw" />
          <div className="tutorial-crop" />
          <span className="tutorial-caption english">Preview the crop.</span>
          <span className="tutorial-caption spanish" lang="es">Previsualiza el recorte.</span>
        </div>
        <div className="tutorial-timeline"><span>0:12</span><i /><span>CC</span></div>
      </div>
    </div>
  );
}
