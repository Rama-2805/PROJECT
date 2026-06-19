"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";

interface GooeyTextProps {
  texts: string[];
  morphTime?: number;
  cooldownTime?: number;
  className?: string;
}

export function GooeyText({
  texts,
  morphTime = 1,
  cooldownTime = 0.25,
  className,
}: GooeyTextProps) {
  const text1Ref = useRef<HTMLSpanElement>(null);
  const text2Ref = useRef<HTMLSpanElement>(null);

  const [textIndex, setTextIndex] = useState(0);
  const [morph, setMorph] = useState(0);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let animationFrameId: number;
    let lastTime = Date.now();

    const animate = () => {
      const currentTime = Date.now();
      const dt = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      let newCooldown = cooldown - dt;
      if (newCooldown < 0) {
        newCooldown = 0;
      }

      if (newCooldown > 0) {
        setCooldown(newCooldown);
        if (text1Ref.current && text2Ref.current) {
          text1Ref.current.style.filter = "none";
          text1Ref.current.style.opacity = "1";
          text2Ref.current.style.filter = "none";
          text2Ref.current.style.opacity = "0";
        }
      } else {
        let newMorph = morph + dt;
        if (newMorph >= morphTime) {
          setCooldown(cooldownTime);
          setMorph(0);
          setTextIndex((prevIndex) => (prevIndex + 1) % texts.length);
          newMorph = 0;
        } else {
          setMorph(newMorph);
        }

        const fraction = newMorph / morphTime;
        const t = Math.min(1, Math.max(0, fraction));

        if (text1Ref.current && text2Ref.current) {
          // Logarithmic/sigmoid blend for gooey morph
          text1Ref.current.style.filter = `blur(${t * 8}px)`;
          text1Ref.current.style.opacity = `${1 - t}`;

          text2Ref.current.style.filter = `blur(${(1 - t) * 8}px)`;
          text2Ref.current.style.opacity = `${t}`;
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [cooldown, morph, texts, morphTime, cooldownTime]);

  return (
    <div className={cn("relative flex items-center justify-center select-none", className)}>
      {/* SVG filter for the gooey effect */}
      <svg className="absolute w-0 h-0" aria-hidden="true">
        <defs>
          <filter id="gooey-text-filter">
            <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10"
              result="gooey"
            />
            <feBlend in="SourceGraphic" in2="gooey" />
          </filter>
        </defs>
      </svg>

      <div
        className="flex items-center justify-center text-4xl md:text-5xl font-bold tracking-tight text-white h-20"
        style={{ filter: "url(#gooey-text-filter)" }}
      >
        <span
          ref={text1Ref}
          className="absolute text-center select-none"
        >
          {texts[textIndex]}
        </span>
        <span
          ref={text2Ref}
          className="absolute text-center select-none"
        >
          {texts[(textIndex + 1) % texts.length]}
        </span>
      </div>
    </div>
  );
}

export default GooeyText;
