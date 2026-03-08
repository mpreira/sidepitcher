import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faArrowsRotate,
    faCircle,
    faCircleCheck,
    faCircleXmark,
    faDroplet,
    faFutbol,
    faKitMedical,
    faRightLeft,
    faShield,
    faTriangleExclamation,
    faVideo,
} from "@fortawesome/free-solid-svg-icons";

interface Props {
    types: string[];
    onSelect: (type: string) => void;
}

const COMMAND_ICON_MAP: Record<string, typeof faCircle> = {
    "Essai": faFutbol,
    "Transformation": faArrowsRotate,
    "Pénalité réussie": faCircleCheck,
    "Drop": faShield,
    "Essai de pénalité": faCircleCheck,
    "Pénalité manquée": faCircleXmark,
    "Carton jaune": faTriangleExclamation,
    "Carton rouge": faTriangleExclamation,
    "Carton orange": faTriangleExclamation,
    "Changement": faRightLeft,
    "Saignement": faDroplet,
    "Blessure": faKitMedical,
    "Arbitrage Vidéo": faVideo,
};

export default function CommandPanel({ types, onSelect }: Props) {
    return (
        <section className="space-y-2">
        <h2 className="font-semibold">Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {types.map((label) => (
            <button
                key={label}
                className="w-full px-4 py-2 bg-neutral-500/20 text-white border-neutral-700 rounded text-base inline-flex items-center justify-center gap-2"
                onClick={() => onSelect(label)}
            >
                <FontAwesomeIcon icon={COMMAND_ICON_MAP[label] ?? faCircle} />
                {label}
            </button>
            ))}
        </div>
        </section>
    );
}
