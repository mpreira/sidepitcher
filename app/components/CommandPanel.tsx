import React from "react";

interface Props {
    types: string[];
    onSelect: (type: string) => void;
}

export default function CommandPanel({ types, onSelect }: Props) {
    return (
        <section className="space-y-2">
        <h2 className="font-semibold">Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {types.map((label) => (
            <button
                key={label}
                className="w-full px-4 py-2 bg-neutral-500/20 text-white border-neutral-700 rounded text-base"
                onClick={() => onSelect(label)}
            >
                {label}
            </button>
            ))}
        </div>
        </section>
    );
}
