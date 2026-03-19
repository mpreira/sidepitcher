interface Props {
    types: string[];
    onSelect: (type: string) => void;
}

const COMMAND_ICON_MAP: Record<string, string> = {
    "Essai": "🏉",
    "Transformation": "🎯",
    "Pénalité réussie": "✅",
    "Drop": "🦶",
    "Essai de pénalité": "✅",
    "Pénalité manquée": "❌",
    "Carton jaune": "🟨",
    "Carton rouge": "🟥",
    "Carton orange": "🟧",
    "Changement": "🔁",
    "Saignement": "🩸",
    "Blessure": "🩹",
    "Arbitrage Vidéo": "📺",
};

export default function CommandPanel({ types, onSelect }: Props) {
    return (
        <section className="space-y-2">
        <h2 className="font-semibold">Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {types.map((label) => (
            <button
                key={label}
                className="sp-button sp-button-md sp-button-full sp-button-neutral text-base"
                onClick={() => onSelect(label)}
            >
                <span>{COMMAND_ICON_MAP[label] ?? "⚪"}</span>
                {label}
            </button>
            ))}
        </div>
        </section>
    );
}
