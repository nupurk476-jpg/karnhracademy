interface Props {
  icon: React.ElementType;
  title: string;
  description: string;
  iconBg?: string;
}

export default function FeatureCard({
  icon: Icon,
  title,
  description,
  iconBg = "bg-slate-100",
}: Props) {
  return (
    <div className="flex flex-col gap-3 bg-white border border-border rounded-xl p-5">
      <div className={`${iconBg} rounded-lg p-2.5 w-fit`}>
        <Icon className="w-5 h-5 text-foreground" />
      </div>
      <div className="flex flex-col gap-1">
        <h3
          className="font-semibold text-foreground text-base"
          style={{ fontFamily: "Sora, sans-serif" }}
        >
          {title}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
