"use client";

import type { ReactNode } from "react";
import { useSfx } from "@/app/contexts/SfxContext";
import { ProductImageBox } from "../ProductImageBox";
import { MotionButton } from "./MotionButton";
import { FloatingItem, rarityToFloatMod } from "./FloatingItem";
import { RarityGlow } from "./RarityGlow";

type RevealCardProps = {
  name: string;
  image?: string;
  rarity: string;
  rarityClass: string;
  categoryLabel: string;
  playEnterAnimation?: boolean;
  onAddAndOpenAnother?: () => void;
  onViewInventory: () => void;
  onAbandon: () => void;
  footerExtra?: ReactNode;
};

function WarningIcon() {
  return (
    <svg
      className="reveal-card__danger-icon"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    </svg>
  );
}

/** Premium collectible drop — frameless artifact, stable actions. */
export function RevealCard({
  name,
  image,
  rarity,
  rarityClass,
  categoryLabel,
  playEnterAnimation = true,
  onAddAndOpenAnother,
  onViewInventory,
  onAbandon,
  footerExtra,
}: RevealCardProps) {
  const { play } = useSfx();
  const mod = rarityToFloatMod(rarity);

  return (
    <article
      className={[
        "reveal-card",
        rarityClass,
        playEnterAnimation ? "reveal-card--enter" : "reveal-card--settled",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="reveal-card__spotlight" aria-hidden />
      <header className="reveal-card__header">
        <p className="store-kicker">Vật phẩm mới</p>
        <p className="reveal-card__status">Bạn đã nhận được một Keyrambit hiếm</p>
      </header>

      <RarityGlow rarity={rarity} variant="hero" className="reveal-card__visual">
        <FloatingItem rarityMod={mod} intensity="hero" interactive={false}>
          <div
            className={[
              "reveal-card__artifact",
              playEnterAnimation ? "reveal-card__artifact--pop" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <ProductImageBox
              className="reveal-card__artifact-img"
              name={name}
              image={image}
              rarity={rarity}
              imageFit="contain"
              frameless
              idleMotion={false}
              useAura={false}
            />
          </div>
        </FloatingItem>
      </RarityGlow>

      <div className="reveal-card__meta">
        <span className={`reveal-card__badge ${rarityClass}`}>{rarity}</span>
        <h3 className="reveal-card__title">{name}</h3>
        <p className="reveal-card__category">{categoryLabel}</p>
      </div>

      <div className="reveal-card__actions">
        {onAddAndOpenAnother ? (
          <MotionButton variant="action" type="button" onClick={onAddAndOpenAnother} className="w-full reveal-card__cta-primary">
            Thêm vào kho &amp; mở hộp khác
          </MotionButton>
        ) : null}

        <button
          type="button"
          onClick={() => {
            play("ui_click");
            onViewInventory();
          }}
          className="reveal-card__link"
        >
          Xem kho đồ
        </button>

        <button
          type="button"
          onClick={() => {
            play("ui_click");
            onAbandon();
          }}
          className="reveal-card__danger"
        >
          <WarningIcon />
          <span>Từ bỏ vật phẩm</span>
        </button>

        {footerExtra}
      </div>
    </article>
  );
}
