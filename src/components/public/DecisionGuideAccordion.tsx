import Link from "next/link";

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
    <div className="decision-guide-accordion" role="list" aria-labelledby={labelledBy}>
      {items.map((item, index) => (
        <details
          className="decision-guide-card"
          data-home-motion="review-card"
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
              <span>{item.title}</span>
            </h3>
          </summary>
          <div className="decision-guide-card__panel">
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
