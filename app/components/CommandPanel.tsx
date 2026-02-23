import React from "react";

interface Props {
    types: string[];
    onSelect: (type: string) => void;
}

export default function CommandPanel({ types, onSelect }: Props) {
    return (
        <section className="space-y-2">
        <h2 className="font-semibold">Commands</h2>
        <div className="flex flex-wrap gap-2">
            {types.map((label) => (
            <button
                key={label}
                className="px-4 py-2 bg-blue-500 text-white rounded"
                onClick={() => onSelect(label)}
            >
                {label}
            </button>
            ))}
        </div>
        </section>
    );
}
