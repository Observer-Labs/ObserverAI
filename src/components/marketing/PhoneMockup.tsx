"use client";
import { useTranslations } from "next-intl";

/** WhatsApp conversation in a dark phone frame — the hero device. */
export default function PhoneMockup() {
  const t = useTranslations("landing");
  return (
    <div className="relative mx-auto w-80 max-w-full overflow-hidden rounded-[36px] border-[10px] border-[#18181b] bg-[#0a0a0a] shadow-[0_30px_90px_rgba(40,30,15,0.22)]">
      <div className="absolute left-1/2 top-0 z-[3] h-[22px] w-[120px] -translate-x-1/2 rounded-b-[14px] bg-[#18181b]" />
      <div className="flex items-center gap-[11px] bg-[#1f2c34] px-4 pb-3 pt-[26px]">
        <div className="flex size-[38px] items-center justify-center rounded-full border-[1.5px] border-white/15 bg-[#202c33] text-[0.9rem] font-extrabold text-[#e9edef]">S</div>
        <div className="flex-1">
          <div className="text-[0.92rem] font-semibold text-[#e9edef]">Observer</div>
          <div className="text-[0.7rem] text-[#8696a0]">{t("waBusinessLabel")}</div>
        </div>
        <div className="text-[1.1rem] text-[#8696a0]">⋮</div>
      </div>
      <div className="flex min-h-[420px] flex-col gap-2 bg-[#0b141a] px-3 pb-[18px] pt-4">
        <div className="max-w-[92%] rounded-[4px_12px_12px_12px] bg-[#202c33] px-[13px] py-[11px]">
          <div className="mb-[5px] text-[0.8rem] font-extrabold text-[#f0857d]">{t("waUrgentLabel")}</div>
          <div className="mb-[7px] text-[0.82rem] leading-relaxed text-[#e9edef]">
            <strong>{t("feedCard1Title")}</strong><br />
            {t("feedCard1Body")}
          </div>
          <div
            className="border-t border-white/[0.07] pt-[7px] text-[0.72rem] text-[#8696a0]"
            dangerouslySetInnerHTML={{ __html: t.raw("waReplyHint") }}
          />
          <div className="mt-1 text-right text-[0.6rem] text-[#667781]">09:24</div>
        </div>
        <div className="max-w-[50%] self-end rounded-[12px_4px_12px_12px] bg-[#005c4b] px-[13px] py-2">
          <div className="text-[0.85rem] font-semibold text-[#e9edef]">1</div>
          <div className="mt-0.5 text-right text-[0.6rem] text-[#9fd9bf]">09:24 ✓✓</div>
        </div>
        <div className="max-w-[92%] rounded-[4px_12px_12px_12px] bg-[#202c33] px-[13px] py-[11px]">
          <div className="text-[0.8rem] leading-[1.55] text-[#e9edef]">
            🧠 <strong>{t("feedCard3Title")}:</strong> {t("feedCard3Body")}
          </div>
          <div className="mt-1 text-right text-[0.6rem] text-[#667781]">09:24</div>
        </div>
        <div className="max-w-[80%] rounded-[10px] border border-[#00a884]/30 bg-[#00a884]/[0.18] px-3 py-2">
          <div className="text-[0.76rem] font-semibold text-[#7fe0c0]">✅ {t("pipelineHandled")}</div>
        </div>
      </div>
    </div>
  );
}
