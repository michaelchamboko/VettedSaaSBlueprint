import Link from "next/link";
import Image from "next/image";

const guideImages = ["decision", "solution", "scenario"];

type DecisionGuideItem = {
  title: string;
  description: string;
  href: string;
};

export function DecisionGuideAccordion({
  groupName,
  labelledBy,
  items,
}: {
  groupName: string;
  labelledBy: string;
  items: readonly DecisionGuideItem[];
}) {
  return (
    <div className="decision-guide-accordion" data-home-motion="review-card" role="list" aria-labelledby={labelledBy}>
      {items.map((item, index) => (
        <details
          className="decision-guide-card"
          key={item.href}
          name={groupName}
          open={index === 0}
          role="listitem"
        >
          <summary>
            <h3>
              <span className="decision-guide-card__index" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="decision-guide-card__title">{item.title}</span>
            </h3>
          </summary>
          <div className="decision-guide-card__panel">
            <div className="decision-guide-card__image">
              <Image src={`/images/decision-guides/${guideImages[index % guideImages.length]}.png`} alt="" width={1122} height={1402} sizes="(max-width: 800px) 90vw, 45vw" />
            </div>
            <p>{item.description}</p>
            <Link href={item.href}>
              Open guide <span aria-hidden="true">→</span>
            </Link>
          </div>
        </details>
      ))}
    </div>
  );
}
