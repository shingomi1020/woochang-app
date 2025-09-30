"use client";
import React, { memo, useState, useEffect, useMemo, useCallback, useRef } from "react";

/* ================= UI ================= */
const Card = memo(({ className = "", children }) => (
  <div className={`border rounded-2xl shadow-sm bg-white ${className}`}>{children}</div>
));
const CardContent = memo(({ className = "", children }) => (
  <div className={`p-4 md:p-6 ${className}`}>{children}</div>
));
const Button = memo(({ className = "", variant = "ghost", ...props }) => (
  <button
    {...props}
    data-variant={variant}
    className={`inline-flex items-center justify-center rounded-xl border px-3 py-2 md:py-1.5 text-sm min-h-[40px] md:min-h-[36px] active:scale-95 transition ${
      variant === "ghost" ? "hover:bg-gray-50" : ""
    } ${className}`}
  />
));

/* =============== Consts =============== */
const NF = typeof Intl !== "undefined" ? new Intl.NumberFormat("ko-KR") : null;
const format = (n) => (Number.isFinite(n) ? (NF ? NF.format(n) : n.toLocaleString()) : "0");

const AREA_UNIT_PRICE = 11000;
const STICKER_UNIT_PRICE = 40000;
const MIN_SUPPLY = 25000;
const MAX_MM = 100000;
const MAX_QTY = 10000;
const DELIVERY_RATE_IN_CITY = 10000;
const DELIVERY_RATE_OUT_CITY = 20000;
const PET_WIDTH_MAX = 1800;
const PET_HEIGHT_MAX = 10000;

const UNIT_PRICES_WATER = {
  300: 7000, 400: 7000, 500: 7000, 600: 7000, 700: 7000, 800: 7000, 900: 7000,
  1000: 8000, 1100: 10000, 1200: 10000, 1300: 15000, 1400: 15000, 1500: 15000,
  1600: 16000, 1800: 17000,
};
const UNIT_PRICES_SOLVENT = { 900: 15000 };
const BANDS_ASC_WATER = Object.keys(UNIT_PRICES_WATER).map(Number).sort((a, b) => a - b);
const BANDS_DESC_WATER = [...BANDS_ASC_WATER].sort((a, b) => b - a);
const WATER_BANDS_UNDER_900 = BANDS_ASC_WATER.filter((b) => b <= 900);

const STICKER_BANDS_ASC = [635, 1050, 1270, 1500];
const DOMBO_SIDE_MARGIN = 50;
const DOMBO_TOTAL_MARGIN = DOMBO_SIDE_MARGIN * 2;

/* ============== Options ============== */
const OPTIONS = {
  POST: [
    { id: "아일렛", label: "아일렛", img: "/static/images/eyelet.jpg" },
    { id: "각목+로프", label: "각목+로프", img: "/static/images/woodrope.jpg" },
    { id: "열재단", label: "열재단&재봉", img: "/static/images/hotcut.jpg" },
    { id: "끈고리", label: "끈고리", img: "/static/images/stringhook.jpg" },
    { id: "로프미싱", label: "로프미싱", img: "/static/images/ropesewing.jpg" },
    { id: "양면테이프", label: "양면테이프", img: "/static/images/doubletape.jpg" },
  ],
  DELIVERY: [{ id: "시내", label: "시내" }, { id: "시외", label: "시외" }, { id: "기타", label: "기타" }],
  INSTALL: [{ id: "기타", label: "기타" }],
  ACC: [
    { id: "큐방", label: "큐방" },
    { id: "로프", label: "로프" },
    { id: "배너거치대(실내용)", label: "배너거치대(실내용)" },
    { id: "배너거치대(실외용)", label: "배너거치대(실외용)" },
  ],
};

/* ============== Groups ============== */
const GROUPS = {
  배너: ["PET배너", "부직포배너", "현수막배너"],
  현수막: ["수성현수막", "솔벤현수막", "게시대현수막"],
  "스티커/시트지": ["솔벤시트", "차량용시트", "PVC캘"],
};
const STICKER_MATS = ["솔벤시트", "차량용시트", "PVC캘"];
const isSticker = (m) => STICKER_MATS.includes(m);
const groupOfMat = (m) => (Object.entries(GROUPS).find(([, arr]) => arr.includes(m)) || ["현수막"])[0];

/* =============== Utils =============== */
const CLS = {
  inp: "w-28 md:w-24 border rounded-xl p-2.5 md:p-2 text-right",
  small: "text-xs md:text-[11px] text-gray-500",
  badge: "text-xs text-green-700 border border-green-200 bg-green-50 rounded px-2 py-0.5",
};
const HELP_RECLICK = "카드를 다시 클릭하면 선택이 해제됩니다.";
const HELP_DELIVERY = "카드를 다시 클릭하면 선택이 해제됩니다. (시내 10,000원 / 시외 20,000원 / 기타 직접 입력)";
const HELP_INSTALL = "장당 금액이 적용되며 총 결제금액에 포함됩니다. (기타 선택 시 직접 입력)";
const GUIDE_POST = "게시대현수막은 가로 7000 × 세로 900mm 고정, 장당 50,000원(설치비 포함)입니다.";
const GUIDE_NORMAL =
  "900 초과~1800 이하는 한 폭 위 단가가 적용되며, 과금 기준 세로는 매칭된 폭으로 간주됩니다. 예: 5000×901mm → 1000폭 단가 적용. 납품/설치 비용은 장당 부과되며 총 결제금액에 포함됩니다.";
const GUIDE_STICKER = "솔벤시트/차량용시트/PVC캘: 면적단가 40,000원/㎡ 적용. 납품/설치 비용은 장당 부과되며 총 결제금액에 포함됩니다.";

const RE_NON_DIGIT = /[^0-9]/g;
const parseWon = (s) => {
  const n = Number(String(s || "").replace(RE_NON_DIGIT, ""));
  return Number.isFinite(n) ? n : 0;
};
const clampQty = (n) => {
  const x = Number(n);
  return Number.isFinite(x) ? Math.max(1, Math.min(x, MAX_QTY)) : 1;
};
const calcVat = (s) => Math.round(Math.max(0, s) * 0.1);
const togglePick = (prev, next) =>
  prev?.id === next?.id ? { id: "", label: "", img: "" } : next || { id: "", label: "", img: "" };

const locksForMaterial = (m, b = false) =>
  m === "게시대현수막"
    ? { lockW: true, lockH: true, wVal: "7000", hVal: "900" }
    : m === "솔벤현수막"
    ? { lockW: false, lockH: true, wVal: "", hVal: "900" }
    : GROUPS["배너"].includes(m)
    ? b
      ? { lockW: false, lockH: false, wVal: "", hVal: "" }
      : { lockW: true, lockH: true, wVal: "600", hVal: "1800" }
    : { lockW: false, lockH: false, wVal: "", hVal: "" };

const pickBand = (h, asc = BANDS_ASC_WATER, desc = BANDS_DESC_WATER) => {
  if (h <= 900) {
    for (const b of desc) if (b <= h) return b; // (<=900 구간은 ‘같거나 아래 폭’ 선택)
    return asc[0];
  }
  for (const b of asc) if (b >= h) return b; // (900~1800 구간은 ‘한 폭 위’ 선택)
  return asc[asc.length - 1];
};

/* ============== Pricing ============== */
function calcPricing(material, w, h, q, rollBy = "AUTO") {
  // PET배너
  if (material === "PET배너") {
    if (!(q > 0)) return null;
    if (w === 600 && h === 1800) {
      const per = 40000;
      return { mode: "pet-std", matchedHeight: null, unitPriceUsed: per, supplyPerItem: per, supplyTotal: per * q };
    }
    if (!(h > 0 && w > 0)) return null;
    if (w > PET_WIDTH_MAX || h > PET_HEIGHT_MAX) return null;
    const meters = Math.max(1, Math.ceil(h / 1000));
    const perItem = meters * 20000;
    return { mode: "pet-custom", matchedHeight: null, unitPriceUsed: 20000, supplyPerItem: perItem, supplyTotal: perItem * q };
  }

  // 솔벤현수막: 고정 900폭
  if (material === "솔벤현수막") {
    if (!(w > 0 && q > 0)) return null;
    const unit = UNIT_PRICES_SOLVENT[900];
    const perItem = Math.round((w * 900 * unit) / (900 * 1000));
    return { mode: "solvent", matchedHeight: 900, unitPriceUsed: unit, supplyPerItem: perItem, supplyTotal: perItem * q };
  }

  // 스티커/시트지: 면적단가
  if (isSticker(material)) {
    if (!(w > 0 && h > 0 && q > 0)) return null;
    const areaM2 = (w * h) / 1_000_000;
    const perItem = Math.round(areaM2 * STICKER_UNIT_PRICE);
    return { mode: "sticker-area", matchedHeight: null, unitPriceUsed: STICKER_UNIT_PRICE, supplyPerItem: perItem, supplyTotal: perItem * q };
  }

  // 물성(수성/현수막배너)
  if (!(w > 0 && h > 0 && q > 0)) return null;
  const waterExactPreferred = material === "수성현수막" || material === "현수막배너";

  // ★★ NEW: 한 변이 900 이하 & 다른 변이 1800 초과인 경우 → 반드시 ‘짧은 변 기준 한 폭 위(ceil)’ 롤 계산
  if (waterExactPreferred) {
    const small = Math.min(w, h);
    const large = Math.max(w, h);
    if (small > 0 && small <= 900 && large > 1800) {
      const ceilBandUnder900 = WATER_BANDS_UNDER_900.find((b) => b >= small) || 900;
      const unit = UNIT_PRICES_WATER[ceilBandUnder900] || 0;
      if (unit) {
        const per = Math.round((large * small * unit) / (ceilBandUnder900 * 1000));
        return {
          mode: "roll",
          orientation: h === small ? "H" : "W",
          matchedHeight: ceilBandUnder900,
          unitPriceUsed: unit,
          supplyPerItem: per,
          supplyTotal: per * q,
        };
      }
    }
  }

  // 정확매칭 우선 후보
  if (waterExactPreferred) {
    const cands = [];
    const bandW = pickBand(w), bandH = pickBand(h);

    if (bandW && w <= bandW && bandW <= 1800) {
      const unitW = UNIT_PRICES_WATER[bandW] || 0;
      if (unitW) {
        const effW = w <= 900 ? w : bandW;
        const perW = Math.round((h * effW * unitW) / (bandW * 1000));
        cands.push({ mode: "roll", orientation: "W", matchedHeight: bandW, unitPriceUsed: unitW, supplyPerItem: perW, supplyTotal: perW * q });
      }
    }
    if (bandH && h <= bandH && bandH <= 1800) {
      const unitH = UNIT_PRICES_WATER[bandH] || 0;
      if (unitH) {
        const effH = h <= 900 ? h : bandH;
        const perH = Math.round((w * effH * unitH) / (bandH * 1000));
        cands.push({ mode: "roll", orientation: "H", matchedHeight: bandH, unitPriceUsed: unitH, supplyPerItem: perH, supplyTotal: perH * q });
      }
    }
    if (BANDS_ASC_WATER.includes(w) && w <= 1800) {
      const u = UNIT_PRICES_WATER[w] || 0;
      if (u) {
        const effW = w <= 900 ? w : w;
        const perW = Math.round((h * effW * u) / (w * 1000));
        cands.push({ mode: "roll", orientation: "W", matchedHeight: w, unitPriceUsed: u, supplyPerItem: perW, supplyTotal: perW * q });
      }
    }
    if (BANDS_ASC_WATER.includes(h) && h <= 1800) {
      const u = UNIT_PRICES_WATER[h] || 0;
      if (u) {
        const effH = h <= 900 ? h : h;
        const perH = Math.round((w * effH * u) / (h * 1000));
        cands.push({ mode: "roll", orientation: "H", matchedHeight: h, unitPriceUsed: u, supplyPerItem: perH, supplyTotal: perH * q });
      }
    }
    if (cands.length) {
      cands.sort((a, b) => a.matchedHeight - b.matchedHeight); // 더 작은 폭 우선
      return cands[0];
    }
  }

  // 면적단가
  if (h > 1800) {
    const areaM2 = (w * h) / 1_000_000;
    const perItem = Math.round(areaM2 * AREA_UNIT_PRICE);
    return { mode: "area", matchedHeight: null, unitPriceUsed: AREA_UNIT_PRICE, supplyPerItem: perItem, supplyTotal: perItem * q };
  }

  // 롤 계산 (W/H/AUTO)
  if (rollBy === "W") {
    const matchedW = pickBand(w), unitW = UNIT_PRICES_WATER[matchedW] || 0;
    if (!matchedW || !unitW) return null;
    const effW = w <= 900 ? w : matchedW;
    const perItemW = Math.round((h * effW * unitW) / (matchedW * 1000));
    return { mode: "roll", orientation: "W", matchedHeight: matchedW, unitPriceUsed: unitW, supplyPerItem: perItemW, supplyTotal: perItemW * q };
  }
  if (rollBy === "H") {
    const matchedH = pickBand(h), unitH = UNIT_PRICES_WATER[matchedH] || 0;
    if (!matchedH || !unitH) return null;
    const effH = h <= 900 ? h : matchedH;
    const perItemH = Math.round((w * effH * unitH) / (matchedH * 1000));
    return { mode: "roll", orientation: "H", matchedHeight: matchedH, unitPriceUsed: unitH, supplyPerItem: perItemH, supplyTotal: perItemH * q };
  }

  const matchedW = pickBand(w), unitW = UNIT_PRICES_WATER[matchedW] || 0;
  const matchedH = pickBand(h), unitH = UNIT_PRICES_WATER[matchedH] || 0;
  if ((!matchedW || !unitW) && (!matchedH || !unitH)) return null;
  const perW = unitW ? Math.round((h * (w <= 900 ? w : matchedW) * unitW) / (matchedW * 1000)) : Infinity;
  const perH = unitH ? Math.round((w * (h <= 900 ? h : matchedH) * unitH) / (matchedH * 1000)) : Infinity;

  return perW <= perH
    ? { mode: "roll", orientation: "W", matchedHeight: matchedW, unitPriceUsed: unitW, supplyPerItem: perW, supplyTotal: perW * q }
    : { mode: "roll", orientation: "H", matchedHeight: matchedH, unitPriceUsed: unitH, supplyPerItem: perH, supplyTotal: perH * q };
}

/* ============= Post costs ============= */
const woodRopeUnitByHeight = (h) =>
  !(h > 0) ? 2000 : h <= 900 ? 2000
    : h <= 1800 ? 2000 + (([900,1000,1100,1200,1300,1400,1500,1600,1800].indexOf(pickBand(h)) || 0) * 1000)
    : 10000 + Math.ceil((h - 1800) / 100) * 1000;

const sewOrTapeUnitByArea = (w, h) => !(w > 0 && h > 0) ? 0 : Math.max(2000, Math.ceil(w / 1000) * Math.ceil(h / 1000) * 1000);
const eyeletLikeUnitCost = (extra) => Math.max(0, extra) * 500;
const domboMaxWidth = (roll) => (roll > 0 ? roll - DOMBO_TOTAL_MARGIN : Infinity);

/* ============== Shared Card ============== */
const PostCard = memo(function ({ opt, active, onSelect }) {
  const [imgOk, setImgOk] = useState(true);
  const hasImg = !!opt.img && imgOk;
  return (
    <div
      onClick={() => onSelect(opt)}
      className={`cursor-pointer border rounded-xl p-3 text-center select-none transition w-full h-full ${
        active ? "border-blue-500 ring-1 ring-blue-500" : "border-gray-300 hover:border-gray-400"
      }`}
    >
      {hasImg && (
        <div className="relative w-full h-24 md:h-28 rounded-lg overflow-hidden bg-gray-100">
          <img loading="lazy" decoding="async" src={opt.img} alt={opt.label}
               className="absolute inset-0 w-full h-full object-cover" onError={() => setImgOk(false)} />
        </div>
      )}
      <div className={`text-[11px] ${hasImg ? "mt-2" : "mt-0"} whitespace-nowrap tracking-tight leading-5`}>{opt.label}</div>
    </div>
  );
});

/* ============ Small UI ============ */
const NumInput = memo(({ value, onChange, className = "", placeholder = "원/장", disabled = false }) => (
  <input inputMode="numeric" className={`w-32 border rounded-xl p-2 text-right ${className}`} placeholder={placeholder}
         value={value} onChange={(e) => onChange(e.target.value.replace(RE_NON_DIGIT, ""))} disabled={disabled}/>
));
const SectionCards = memo(function ({ title, options, value, setValue, helper, otherLabel, otherValue, onOtherChange, hidden }) {
  if (hidden) return null;
  return (
    <div className="mt-6">
      <label className="block text-sm font-medium">{title}</label>
      <div className="grid grid-cols-3 gap-2 mt-2">
        {options.map((opt) => (
          <PostCard key={opt.id} opt={opt} active={value.id === opt.id} onSelect={(c) => setValue((p) => togglePick(p, c))} />
        ))}
      </div>
      {value.id === "기타" && (
        <div className="mt-2 flex items-center gap-2 text-sm">
          <span className={CLS.small}>{otherLabel}</span>
          <NumInput value={otherValue} onChange={(v) => onOtherChange(v)} />
          <span className={CLS.small}>원/장</span>
        </div>
      )}
      <div className={`${CLS.small} mt-1`}>{helper}</div>
    </div>
  );
});
const Tabs = memo(function ({ tabs, active, onChange }) {
  return (
    <div className="flex flex-wrap gap-2 border-b mb-4 pb-2">
      {tabs.map((t) => (
        <button key={t} type="button" onClick={() => onChange(t)}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 rounded-t-xl ${
            active === t ? "bg-black text-white border-black" : "bg-white text-black border-transparent hover:bg-gray-100"
          }`}>{t}</button>
      ))}
    </div>
  );
});
const QtyInput = memo(function ({ value, setValue }) {
  return (
    <div className="flex items-center gap-2">
      <Button type="button" onClick={() => setValue(String(clampQty((Number(value || 0) || 1) - 1)))}>−</Button>
      <NumInput value={value} onChange={(v) => setValue(v)} className={CLS.inp} placeholder="장" />
      <Button type="button" onClick={() => setValue(String(clampQty((Number(value || 0) || 1) + 1)))}>＋</Button>
    </div>
  );
});
const Seg = memo(({ items, value, onChange }) => (
  <div className="flex gap-2">
    {items.map((it) => (
      <button key={it} type="button"
        className={`px-3 py-1.5 text-sm rounded-xl border ${value === it ? "bg-black text-white border-black" : "bg-white"}`}
        onClick={() => onChange(it)}>{it}</button>
    ))}
  </div>
));

/* ====== Post-process detail ====== */
const PostDetail = memo(function ({ postId, label, qty, width, height, pricing, eyeletExtra, eyeletExtraStr, setEyeletExtraStr }) {
  if (postId === "아일렛" || postId === "끈고리")
    return (
      <div className="mt-3 bg-slate-50 border rounded-xl p-3 text-sm space-y-2">
        <div className="flex items-center justify-between"><span>{label}</span><span className="font-medium">무료 / 장</span></div>
        <div className="flex items-center justify-between gap-2">
          <label className="whitespace-nowrap">{postId === "끈고리" ? "추가 끈고리 수량" : "추가 타공 수량"}</label>
          <div className="flex items-center gap-2">
            <Button type="button" onClick={() => setEyeletExtraStr(String(Math.max(0, (Number(eyeletExtraStr || 0) || 0) - 1)))}>−</Button>
            <input inputMode="numeric" className={CLS.inp} value={eyeletExtraStr}
                   onChange={(e) => setEyeletExtraStr(e.target.value.replace(RE_NON_DIGIT, ""))}/>
            <Button type="button" onClick={() => setEyeletExtraStr(String((Number(eyeletExtraStr || 0) || 0) + 1))}>＋</Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1 text-xs text-gray-700">
          <div>기본: <b>4</b>개/장 (무료)</div>
          <div>추가: <b>{eyeletExtra}</b>개/장</div>
          <div>합계: <b>{4 + eyeletExtra}</b>개/장</div>
          <div>{postId === "끈고리" ? "총 끈고리 수" : "총 타공수"}: <b>{(4 + eyeletExtra) * qty}</b>개</div>
        </div>
      </div>
    );
  if (postId === "각목+로프")
    return (
      <div className="mt-3 bg-slate-50 border rounded-xl p-3 text-sm space-y-2">
        <div className="flex items-center justify-between">
          <span>각목+로프</span>
          <span className="font-medium">장당 기본 1벌(=2개) · {format(woodRopeUnitByHeight((pricing?.matchedHeight ?? height) || 0))}원</span>
        </div>
        <div className="grid grid-cols-2 gap-1 text-xs text-gray-700">
          <div>장당 벌 수: <b>1</b>벌</div>
          <div>총 벌 수: <b>{qty}</b>벌</div>
        </div>
      </div>
    );
  if (postId === "로프미싱" || postId === "양면테이프")
    return (
      <div className="mt-3 bg-slate-50 border rounded-xl p-3 text-sm space-y-2">
        <div className="flex items-center justify-between"><span>{label}</span>
          <span className="font-medium">{format(sewOrTapeUnitByArea(width || 0, height || 0))}원</span></div>
        <div className="text-xs text-gray-600">계산식: ⌈가로/1000⌉ × ⌈세로/1000⌉ × 1000원 (최소 2,000원)</div>
      </div>
    );
  return null;
});

/* ====== Accessory (큐방) ====== */
const AccessoryDetail = memo(function ({ accId, qty, extraStr, setExtraStr }) {
  if (accId !== "큐방") return null;
  const extra = Math.max(0, Math.min(Number(extraStr) || 0, 1000));
  return (
    <div className="mt-3 bg-slate-50 border rounded-xl p-3 text-sm space-y-2">
      <div className="flex items-center justify-between"><span>큐방</span><span className="font-medium">무료 / 장</span></div>
      <div className="flex items-center justify-between gap-2">
        <label className="whitespace-nowrap">추가 큐방 수량</label>
        <div className="flex items-center gap-2">
          <Button type="button" onClick={() => setExtraStr(String(Math.max(0, (Number(extraStr || 0) || 0) - 1)))}>−</Button>
          <input inputMode="numeric" className={CLS.inp} value={extraStr}
                 onChange={(e) => setExtraStr(e.target.value.replace(RE_NON_DIGIT, ""))}/>
          <Button type="button" onClick={() => setExtraStr(String((Number(extraStr || 0) || 0) + 1))}>＋</Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1 text-xs text-gray-700">
        <div>기본: <b>4</b>개/장 (무료)</div>
        <div>추가: <b>{extra}</b>개/장</div>
        <div>합계: <b>{4 + extra}</b>개/장</div>
        <div>총 큐방 수: <b>{(4 + extra) * qty}</b>개</div>
      </div>
      <div className="text-xs text-gray-600">아일렛 규칙과 동일: 추가분 × 500원/장</div>
    </div>
  );
});

/* ================= Form ================= */
function PricingForm() {
  const tabs = useMemo(() => ["실사출력", "간판"], []);
  const [activeTab, setActiveTab] = useState(tabs[0]);

  const [material, setMaterial] = useState("수성현수막"),
        [wStr, setWStr] = useState(""),
        [hStr, setHStr] = useState(""),
        [qStr, setQStr] = useState("1");
  const [group, setGroup] = useState(groupOfMat(material));
  const [bannerCustom, setBannerCustom] = useState(false);

  const [wWarn, setWWarn] = useState(false), [hWarn, setHWarn] = useState(false);
  const [postProcess, setPostProcess] = useState({ id: "", label: "", img: "" }), [eyeletExtraStr, setEyeletExtraStr] = useState("0");
  const [delivery, setDelivery] = useState({ id: "", label: "", img: "" }), [deliveryOtherStr, setDeliveryOtherStr] = useState("");
  const [install, setInstall] = useState({ id: "", label: "", img: "" }), [installOtherStr, setInstallOtherStr] = useState("");
  const [accessory, setAccessory] = useState({ id: "", label: "", img: "" }), [suctionExtraStr, setSuctionExtraStr] = useState("0");
  const [dombo, setDombo] = useState(false), [stickerRoll, setStickerRoll] = useState(null), [domboExceeded, setDomboExceeded] = useState(false);

  const isPostBanner = material === "게시대현수막";
  const showPostProcess = !(isPostBanner || isSticker(material));

  const resetAll = useCallback(() => {
    setQStr("1");
    setPostProcess({ id: "", label: "", img: "" });
    setDelivery({ id: "", label: "", img: "" });
    setInstall({ id: "", label: "", img: "" });
    setAccessory({ id: "", label: "", img: "" });
    setDeliveryOtherStr(""); setInstallOtherStr("");
    setEyeletExtraStr("0"); setSuctionExtraStr("0");
    setDombo(false); setStickerRoll(null); setDomboExceeded(false);
  }, []);

  const prevMat = useRef(material);
  useEffect(() => {
    const { lockW, lockH, wVal, hVal } = locksForMaterial(material, bannerCustom);
    if (material !== prevMat.current) resetAll();
    setWStr(lockW ? wVal : ""); setHStr(lockH ? hVal : ""); prevMat.current = material;
  }, [material, bannerCustom, resetAll]);

  useEffect(() => { if (!GROUPS[group].includes(material)) setMaterial(GROUPS[group][0]); resetAll(); setBannerCustom(false); }, [group]); // eslint-disable-line

  useEffect(() => {
    if (material !== "PET배너" || !bannerCustom) { setWWarn(false); setHWarn(false); return; }
    const w = Number(wStr) || 0, h = Number(hStr) || 0;
    if (w > PET_WIDTH_MAX) { setWStr(String(PET_WIDTH_MAX)); setWWarn(true); } else if (wWarn) setWWarn(false);
    if (h > PET_HEIGHT_MAX) { setHStr(String(PET_HEIGHT_MAX)); setHWarn(true); } else if (hWarn) setHWarn(false);
  }, [material, bannerCustom, wStr, hStr, wWarn, hWarn]);

  // 스티커 돔보커팅: 롤 선택 시 가로 상한 보정
  useEffect(() => {
    if (isSticker(material) && dombo && stickerRoll) {
      const max = stickerRoll - DOMBO_TOTAL_MARGIN;
      const w = Number(wStr) || 0;
      if (w > max) { setWStr(String(max)); setDomboExceeded(true); }
      else if (domboExceeded) setDomboExceeded(false);
    } else if (domboExceeded) setDomboExceeded(false);
  }, [material, dombo, stickerRoll, wStr, domboExceeded]);

  const width = Number(wStr) || 0, height = Number(hStr) || 0, qty = clampQty(qStr);
  const eyeletExtra = useMemo(() => Math.max(0, Math.min(Number(eyeletExtraStr) || 0, 1000)), [eyeletExtraStr]);
  const suctionExtra = useMemo(() => Math.max(0, Math.min(Number(suctionExtraStr) || 0, 1000)), [suctionExtraStr]);

  const pricing = useMemo(() => isPostBanner
      ? { mode: "fixed", unitPriceUsed: 50000, supplyPerItem: 50000, supplyTotal: 50000 * qty }
      : calcPricing(material, width, height, qty), [isPostBanner, material, width, height, qty]);

  const postCostPerItem = useMemo(() => {
    switch (postProcess.id) {
      case "아일렛":
      case "끈고리": return eyeletLikeUnitCost(eyeletExtra);
      case "각목+로프": return woodRopeUnitByHeight((pricing?.matchedHeight ?? height) || 0);
      case "로프미싱":
      case "양면테이프": return sewOrTapeUnitByArea(width || 0, height || 0);
      default: return 0;
    }
  }, [postProcess.id, width, height, eyeletExtra, pricing]);

  const accessoryPerItem = useMemo(() => (group === "배너" && accessory.id === "큐방" ? eyeletLikeUnitCost(suctionExtra) : 0), [group, accessory.id, suctionExtra]);
  const deliveryPerItem = useMemo(() =>
      isPostBanner ? 0 : delivery.id === "시내" ? DELIVERY_RATE_IN_CITY :
      delivery.id === "시외" ? DELIVERY_RATE_OUT_CITY : delivery.id === "기타" ? parseWon(deliveryOtherStr) : 0,
    [delivery.id, deliveryOtherStr, isPostBanner]);
  const installPerItem = useMemo(() => (isPostBanner ? 0 : install.id === "기타" ? parseWon(installOtherStr) : 0), [install.id, installOtherStr, isPostBanner]);

  const { baseSupplyRaw, baseShown, postSupply, accSupply, deliverySupply, installSupply, supplyShown, vat, total, minApplied } =
    useMemo(() => {
      const baseSupplyRaw = pricing?.supplyTotal || 0;
      const baseShown = baseSupplyRaw > 0 ? Math.max(baseSupplyRaw, MIN_SUPPLY) : 0;
      const postSupply = showPostProcess ? postCostPerItem * qty : 0;
      const accSupply = accessoryPerItem * qty;
      const deliverySupply = deliveryPerItem * qty;
      const installSupply = installPerItem * qty;
      const supplyShown = baseShown + postSupply + accSupply + deliverySupply + installSupply;
      const vat = calcVat(supplyShown);
      const total = supplyShown + vat;
      const minApplied = baseShown !== baseSupplyRaw;
      return { baseSupplyRaw, baseShown, postSupply, accSupply, deliverySupply, installSupply, supplyShown, vat, total, minApplied };
    }, [pricing, showPostProcess, postCostPerItem, qty, accessoryPerItem, deliveryPerItem, installPerItem]);

  const note = useMemo(() => {
    if (!pricing) return "";
    if (isPostBanner) return "게시대현수막: 장당 50,000원 (설치비 포함)";
    if (pricing.mode === "pet-std") return "PET배너: 규격 600×1800 40,000원/장";
    if (pricing.mode === "pet-custom") return "PET배너: 비규격 세로 1m당 20,000원";
    if (pricing.mode === "solvent") return "솔벤현수막: 900폭 단일, 단가 15,000원/ｍ";
    if (pricing.mode === "sticker-area") return `${material}: 면적단가(40,000원/㎡) 적용`;
    if (pricing.mode === "area") return "1800폭 초과: 면적단가(11,000원/㎡) 적용";
    return `${pricing.matchedHeight}폭 단가(${format(pricing.unitPriceUsed)}원/ｍ) 적용`;
  }, [pricing, isPostBanner, material]);

  const currentLocks = useMemo(() => locksForMaterial(material, bannerCustom), [material, bannerCustom]);
  const onResetSizes = useCallback(() => { if (!isPostBanner) setWStr(""); if (!(isPostBanner || material === "솔벤현수막")) setHStr(""); }, [isPostBanner, material]);

  const fastQty = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
  const rightRows = (min) => [
      [min ? "공급가(최저 적용)" : "공급가", min ? baseShown : baseSupplyRaw],
      postSupply > 0 && ["후가공", postSupply],
      accSupply > 0 && ["부속품", accSupply],
      deliverySupply > 0 && ["납품", deliverySupply],
      installSupply > 0 && ["설치·시공", installSupply],
      ["공급가 합계", baseShown + postSupply + accSupply + deliverySupply + installSupply],
      ["부가세(10%)", vat],
      ["총수량", `${qty}장`],
      ["적용 기준", note],
    ].filter(Boolean);

  const basisRowText = pricing
    ? pricing.mode === "pet-std" ? `PET 규격 600×1800 · ${format(40000)}원/장`
      : pricing.mode === "pet-custom" ? `PET 비규격 세로 ${Math.max(1, Math.ceil((Number(hStr) || 0) / 1000))}m × ${format(20000)}원`
      : pricing.mode === "roll" ? `적용 폭 ${pricing.matchedHeight}폭 · ${format(pricing.unitPriceUsed)}원/ｍ`
      : pricing.mode === "sticker-area" ? `${material} 면적단가 ${format(pricing.unitPriceUsed)}원/㎡`
      : pricing.mode === "area" ? `면적단가 ${format(pricing.unitPriceUsed)}원/㎡`
      : pricing.mode === "solvent" ? `솔벤 900폭 · ${format(pricing.unitPriceUsed)}원/ｍ`
      : pricing.mode === "fixed" ? `게시대현수막 장당 고정가 ${format(pricing.unitPriceUsed)}원`
      : null
    : null;

  return (
    <div className="p-4 md:p-6 pb-28 md:pb-6 max-w-4xl mx-auto">
      <Tabs tabs={["실사출력", "간판"]} active={activeTab} onChange={setActiveTab} />
      <Card className="shadow-md">
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* 좌측 */}
          <div className="space-y-3 md:space-y-4 min-w-0">
            <div>
              <label className="block text-sm font-medium">제품군</label>
              <Seg items={["현수막", "배너", "스티커/시트지"]} value={group} onChange={setGroup} />
              <label className="block text-sm font-medium mt-3">제품</label>
              <select className="w-full border rounded-xl p-2" value={material} onChange={(e) => setMaterial(e.target.value)}>
                {GROUPS[group].map((m) => (<option key={m} value={m}>{m}</option>))}
              </select>
            </div>

            <div>
              {/* 돔보커팅 */}
              {isSticker(material) && <div className={CLS.small + " mt-1"}>스티커/시트지 원단폭 <b>635/1050/1270/1500mm</b></div>}
              {isSticker(material) && (
                <div className="mt-3">
                  <label className="block text-sm font-medium">돔보 커팅</label>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" variant={dombo ? "solid" : "ghost"}
                            className={`${dombo ? "bg-black text-white border-black hover:bg-black" : ""}`}
                            onClick={() => setDombo((v) => !v)}>돔보커팅</Button>
                    {dombo && (
                      <>
                        <span className={CLS.small}>원단폭</span>
                        {STICKER_BANDS_ASC.map((b) => (
                          <Button key={b} type="button" variant={stickerRoll === b ? "solid" : "ghost"}
                                  className={`${stickerRoll === b ? "bg-black text-white border-black hover:bg-black" : ""}`}
                                  onClick={() => setStickerRoll(b)}>{b}mm</Button>
                        ))}
                      </>
                    )}
                  </div>
                  {dombo && stickerRoll && (
                    <div className={CLS.small + " mt-1"}>
                      선택 폭 {stickerRoll}mm 기준 좌우 50mm 여유 적용 → 최대 가로 <b>{stickerRoll - 100}mm</b>
                    </div>
                  )}
                  {dombo && stickerRoll && domboExceeded && (
                    <div className="text-xs text-red-600 mt-1">
                      가로는 선택한 원단폭 {stickerRoll}mm 기준 좌우 50mm 여유를 두어 최대 {stickerRoll - 100}mm까지만 가능합니다.
                    </div>
                  )}
                </div>
              )}

              <label className="block text-sm font-medium">사이즈</label>
              <div className="flex flex-wrap items-center gap-2">
                <span className={CLS.small}>가로</span>
                <NumInput
                  value={wStr}
                  onChange={(v) => {
                    if (isSticker(material) && dombo && stickerRoll) {
                      const max = stickerRoll - DOMBO_TOTAL_MARGIN;
                      const n = Number(v || 0);
                      if (n > max) { setDomboExceeded(true); return; }
                      else if (domboExceeded) setDomboExceeded(false);
                    }
                    setWStr(v);
                  }}
                  className={`${CLS.inp} ${currentLocks.lockW ? "bg-gray-50 text-blue-700 font-semibold opacity-100" : ""}`}
                  placeholder="mm" disabled={currentLocks.lockW}
                />
                <span className={CLS.small}>세로</span>
                <NumInput value={hStr} onChange={setHStr}
                  className={`${CLS.inp} ${currentLocks.lockH ? "bg-gray-50 text-blue-700 font-semibold opacity-100" : ""}`}
                  placeholder="mm" disabled={currentLocks.lockH}/>
                {(!currentLocks.lockW || !currentLocks.lockH) && (
                  <>
                    <Button type="button" className="ml-2" onClick={onResetSizes}>초기화</Button>
                    <span className="text-xs text-gray-500">안전 한도: {format(MAX_MM)}mm</span>
                  </>
                )}
                {isPostBanner && <span className={CLS.badge}>설치비 포함</span>}
                {group === "배너" && (
                  <>
                    <Button type="button" variant={bannerCustom ? "solid" : "ghost"}
                      className={`ml-2 ${bannerCustom ? "bg-black text-white border-black hover:bg-black" : ""}`}
                      onClick={() => setBannerCustom((v) => !v)}>{bannerCustom ? "비규격 해제" : "비규격 적용"}</Button>
                    <span className={CLS.small}>{bannerCustom ? "직접 입력 가능" : "기본 600×1800"}</span>
                  </>
                )}
              </div>
              {material === "PET배너" && bannerCustom && (wWarn || hWarn) && (
                <div className="text-xs text-red-600 mt-1">
                  {wWarn && hWarn ? "가로는 최대 1800mm, 세로는 최대 10,000mm 입니다. 입력값을 상한으로 보정했습니다."
                    : wWarn ? "가로는 최대 1800mm 입니다. 입력값을 상한으로 보정했습니다."
                    : "세로는 최대 10,000mm 입니다. 입력값을 상한으로 보정했습니다."}
                </div>
              )}
            </div>
            {material === "PET배너" && <div className={CLS.small + " mt-1"}>PET 원단폭 <b>600/1200/1800mm</b>, 세로 최대 <b>10,000mm</b></div>}

            <div>
              <label className="block text-sm font-medium">수량</label>
              <QtyInput value={qStr} setValue={setQStr} />
              {isPostBanner && (
                <>
                  <div className="mt-2 grid grid-cols-5 gap-2">
                    {[5,10,15,20,25,30,35,40,45,50].map((n) => (
                      <Button key={n} variant={Number(qStr) === n ? "solid" : "ghost"}
                              className={`${Number(qStr) === n ? "bg-black text-white border-black hover:bg-black" : ""}`}
                              onClick={() => setQStr((p) => String(Number(p) === n ? 1 : n))}>{n}개</Button>
                    ))}
                  </div>
                  <div className="mt-1 text-xs md:text-[11px] text-gray-500">빠른 선택</div>
                </>
              )}
              <p className={CLS.small + " mt-1"}>최대 {format(MAX_QTY)}장</p>
            </div>

            {showPostProcess && (
              <div>
                <label className="block text-sm font-medium">후가공</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {OPTIONS.POST.map((o) => (
                    <PostCard key={o.id} opt={o} active={postProcess.id === o.id}
                              onSelect={(c) => setPostProcess((p) => togglePick(p, c))}/>
                  ))}
                </div>
                <div className={CLS.small + " mt-1"}>{HELP_RECLICK}</div>
                <PostDetail postId={postProcess.id} label={postProcess.label} qty={qty}
                            width={width} height={height} pricing={pricing}
                            eyeletExtra={eyeletExtra} eyeletExtraStr={eyeletExtraStr} setEyeletExtraStr={setEyeletExtraStr}/>
              </div>
            )}

            <SectionCards title="부속품" options={OPTIONS.ACC} value={accessory} setValue={setAccessory}
                          helper={HELP_RECLICK} otherLabel="" otherValue="" onOtherChange={() => {}} hidden={group !== "배너"}/>
            <AccessoryDetail accId={accessory.id} qty={qty} extraStr={suctionExtraStr} setExtraStr={setSuctionExtraStr}/>
            <SectionCards title="납품" options={OPTIONS.DELIVERY} value={delivery} setValue={setDelivery}
                          helper={HELP_DELIVERY} otherLabel="기타 금액" otherValue={deliveryOtherStr}
                          onOtherChange={setDeliveryOtherStr} hidden={isPostBanner}/>
            <SectionCards title="설치 및 시공" options={OPTIONS.INSTALL} value={install} setValue={setInstall}
                          helper={HELP_INSTALL} otherLabel="기타 금액" otherValue={installOtherStr}
                          onOtherChange={setInstallOtherStr} hidden={isPostBanner}/>
          </div>

          {/* 우측 요약 */}
          <div className="space-y-2 md:border-l md:pl-6 min-w-0">
            {pricing ? (
              <>
                {rightRows(minApplied).map(([k, v]) =>
                  typeof v === "string" ? (
                    <div key={k} className="flex justify-between text-sm gap-2 break-keep"><span className="truncate">{k}</span><span className="shrink-0">{v}</span></div>
                  ) : (
                    v > 0 && <div key={k} className="flex justify-between text-sm gap-2 break-keep"><span className="truncate">{k}</span><span className="shrink-0">{format(v)}원</span></div>
                  )
                )}
                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between items-baseline"><span className="text-lg font-semibold">결제금액</span>
                    <span className="text-2xl text-red-600 font-bold">{format(total)}원</span></div>
                  {minApplied && <div className="text-xs text-gray-600 mt-1">※ 최저 <b>공급가액</b> {format(MIN_SUPPLY)}원 적용</div>}
                </div>
              </>
            ) : (
              <div className="text-xs text-gray-500">가로/세로/수량을 입력하면 자동 계산됩니다.</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 하단 상세 (반응형 표) */}
      <Card className="mt-6">
        <CardContent className="p-4 text-sm">
          <div className="font-semibold mb-2">견적 상세보기</div>
          {pricing ? (
            <div className="overflow-x-auto rounded-xl border">
              <table className="min-w-[560px] w-full text-sm border-separate border-spacing-0">
                <thead className="bg-gray-50 text-gray-600">
                  <tr><th className="px-3 py-2 text-left w-32">항목</th><th className="px-3 py-2 text-left">내역</th><th className="px-3 py-2 text-right w-40">금액</th></tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-3 py-2 align-top text-gray-600 break-keep">제품</td>
                    <td className="px-3 py-2 align-top font-medium break-keep">{material}</td>
                    <td className="px-3 py-2 align-top text-right text-gray-400">-</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 align-top text-gray-600 break-keep">사이즈</td>
                    <td className="px-3 py-2 align-top break-keep">
                      <span className={currentLocks.lockW ? "text-blue-700 font-semibold whitespace-nowrap" : "whitespace-nowrap"}>{width}</span>
                      <span className="px-1">×</span>
                      <span className={currentLocks.lockH ? "text-blue-700 font-semibold whitespace-nowrap" : "whitespace-nowrap"}>{height}</span>
                      <span className="pl-1 whitespace-nowrap">mm</span>
                      {isPostBanner && <span className="ml-2 text-xs text-green-700 whitespace-nowrap">(설치비 포함)</span>}
                    </td>
                    <td className="px-3 py-2 align-top text-right text-gray-400">-</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 align-top text-gray-600 break-keep">수량</td>
                    <td className="px-3 py-2 align-top break-keep whitespace-nowrap">{qty}장</td>
                    <td className="px-3 py-2 align-top text-right text-gray-400">-</td>
                  </tr>
                  {basisRowText && (
                    <tr>
                      <td className="px-3 py-2 align-top text-gray-600 break-keep">단가기준</td>
                      <td className="px-3 py-2 align-top break-keep">{basisRowText}</td>
                      <td className="px-3 py-2 align-top text-right text-gray-400">-</td>
                    </tr>
                  )}
                  <tr>
                    <td className="px-3 py-2 align-top text-gray-600 break-keep">본판</td>
                    <td className="px-3 py-2 align-top break-keep">
                      {minApplied ? (
                        <span>공급가(최저 적용)
                          <span className="ml-1 inline-flex items-center text-xs text-orange-700 border border-orange-200 bg-orange-50 rounded px-1.5 py-0.5 whitespace-nowrap">최저가 적용</span>
                        </span>
                      ) : <span>공급가</span>}
                    </td>
                    <td className="px-3 py-2 align-top text-right font-medium whitespace-nowrap">
                      {format(minApplied ? supplyShown - (postSupply + accSupply + deliverySupply + installSupply) : baseSupplyRaw)}원
                    </td>
                  </tr>
                  {[["후가공", postSupply, postProcess.id ? postProcess.label : "-"],
                    ["부속품", accSupply, accessory.id ? accessory.label : "-"],
                    ["납품", deliverySupply, delivery.id ? delivery.label : "-"],
                    ["설치·시공", installSupply, install.id ? install.label : "-"]]
                    .filter(([, v]) => v > 0)
                    .map(([k, v, desc]) => (
                      <tr key={k}>
                        <td className="px-3 py-2 align-top text-gray-600 break-keep">{k}</td>
                        <td className="px-3 py-2 align-top break-keep">{desc}</td>
                        <td className="px-3 py-2 align-top text-right whitespace-nowrap">{format(v)}원</td>
                      </tr>
                    ))}
                  <tr>
                    <td className="px-3 py-2 align-top text-gray-600 break-keep">공급가 합계</td>
                    <td className="px-3 py-2 align-top text-gray-500 break-keep">(본판 + 후가공 + 부속품 + 납품 + 설치)</td>
                    <td className="px-3 py-2 align-top text-right font-semibold whitespace-nowrap">{format(supplyShown)}원</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50">
                    <td className="px-3 py-2 align-top text-gray-600 break-keep">부가세(10%)</td>
                    <td className="px-3 py-2 align-top"></td>
                    <td className="px-3 py-2 align-top text-right font-medium whitespace-nowrap">{format(vat)}원</td>
                  </tr>
                  <tr className="bg-gray-100">
                    <td className="px-3 py-3 align-top text-gray-900 font-semibold text-base break-keep">결제금액</td>
                    <td className="px-3 py-3 align-top"></td>
                    <td className="px-3 py-3 align-top text-right text-red-600 font-bold text-xl whitespace-nowrap">{format(total)}원</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="text-xs text-gray-500">필수 항목을 입력해 주세요.</div>
          )}
        </CardContent>
      </Card>

      {/* Mobile sticky total */}
      {pricing && (
        <div className="md:hidden fixed bottom-0 inset-x-0 border-t bg-white shadow-lg p-3">
          <div className="max-w-4xl mx-auto flex items-baseline justify-between">
            <span className="text-base font-semibold">결제금액</span>
            <span className="text-xl font-bold text-red-600">{format(total)}원</span>
          </div>
        </div>
      )}

      <div className={CLS.small + " mt-4"}>{isSticker(material) ? GUIDE_STICKER : isPostBanner ? GUIDE_POST : GUIDE_NORMAL}</div>
      <DevTests />
    </div>
  );
}

/* ============== Dev tests ============== */
function shouldClearSizesOnMaterialChange(prev, next) { return prev === "게시대현수막" && next !== "게시대현수막"; }

function DevTests() {
  useEffect(() => {
    console.assert(typeof PostCard === "function", "[DevTests] PostCard must be defined");

    const ropeCases = [
      { h: 900, want: 2000 }, { h: 901, want: 3000 }, { h: 999, want: 3000 }, { h: 1000, want: 3000 },
      { h: 1100, want: 4000 }, { h: 1200, want: 5000 }, { h: 1300, want: 6000 }, { h: 1600, want: 9000 },
      { h: 1700, want: 10000 }, { h: 1800, want: 10000 }, { h: 1801, want: 11000 }, { h: 1899, want: 11000 },
      { h: 1900, want: 11000 }, { h: 1901, want: 12000 }, { h: 2000, want: 12000 }, { h: 2345, want: 16000 },
    ];
    ropeCases.forEach((c) => { const got = woodRopeUnitByHeight(c.h); console.assert(got === c.want, `[DevTests] woodRopeUnitByHeight(${c.h}) expected ${c.want}, got ${got}`); });

    const a1 = sewOrTapeUnitByArea(50, 50), a2 = sewOrTapeUnitByArea(1000, 900), a3 = sewOrTapeUnitByArea(2000, 3000), a4 = sewOrTapeUnitByArea(1999, 1001);
    const _woodEff = (w, h) => woodRopeUnitByHeight((calcPricing("수성현수막", w, h, 1)?.matchedHeight) ?? h);
    console.assert(_woodEff(900, 7000) === 2000, `[DevTests] wood+rope matched band`);
    console.assert(a1 === 2000, "sewOrTape (50×50) expected 2000");
    console.assert(a2 === 2000, "sewOrTape (1000×900) expected 2000");
    console.assert(a3 === 6000, "sewOrTape (2000×3000) expected 6000");
    console.assert(a4 === 4000, "sewOrTape (1999×1001) expected 4000");

    [ [10,300], [900,900], [901,1000], [1000,1000], [1799,1800], [1800,1800] ]
      .forEach(([h, want]) => { const got = pickBand(h, BANDS_ASC_WATER, BANDS_DESC_WATER); console.assert(got === want, `pickBand(${h})→${want}`); });

    const pH = calcPricing("수성현수막", 1000, 901, 1, "H");
    const pW = calcPricing("수성현수막", 1000, 901, 1, "W");
    const pA = calcPricing("수성현수막", 1000, 901, 1);
    console.assert(pH && pH.mode === "roll" && pH.orientation === "H" && pH.matchedHeight === 1000 && pH.supplyTotal === 8000, "roll H expected 8000");
    console.assert(pW && pW.mode === "roll" && pW.orientation === "W" && pW.supplyTotal === 7208, "roll W expected 7208");
    console.assert(pA && pA.mode === "roll" && pA.supplyTotal === Math.min(pH.supplyTotal, pW.supplyTotal), "AUTO cheaper");

    const p2 = calcPricing("수성현수막", 1000, 2000, 1);
    console.assert(p2 && p2.mode === "area" && p2.supplyTotal === 22000, "area 1000×2000");
    const p2W = calcPricing("수성현수막", 1000, 2000, 1, "W");
    console.assert(p2W && p2W.mode === "area", "area rule holds");

    const ex1 = calcPricing("수성현수막", 900, 5000, 1);
    console.assert(ex1 && ex1.mode === "roll" && ex1.orientation === "W" && ex1.matchedHeight === 900 && ex1.supplyTotal === 35000, "exact W=900 roll@900");
    const ex2 = calcPricing("수성현수막", 900, 1200, 1);
    console.assert(ex2 && ex2.mode === "roll" && ex2.matchedHeight === 900 && ex2.supplyTotal === 8400, "both match choose 900");
    const ex3 = calcPricing("현수막배너", 900, 5000, 1);
    console.assert(ex3 && ex3.mode === "roll" && ex3.matchedHeight === 900, "banner-water exact roll");
    const ex4 = calcPricing("수성현수막", 1300, 1800, 1);
    console.assert(ex4 && ex4.mode === "roll" && ex4.matchedHeight === 1300 && ex4.supplyTotal === 27000, "choose 1300");
    const ex5 = calcPricing("수성현수막", 1550, 1800, 1);
    console.assert(ex5 && ex5.mode === "roll" && ex5.matchedHeight === 1600 && ex5.supplyTotal === 28800, "1550→1600");

    // ★ New tests: 짧은 변 기준 ceil 매칭
    const ca1 = calcPricing("수성현수막", 5000, 450, 1);
    console.assert(ca1 && ca1.mode === "roll" && ca1.orientation === "H" && ca1.matchedHeight === 500, "5000×450 → 500폭(H)");
    const ca2 = calcPricing("수성현수막", 450, 5000, 1);
    console.assert(ca2 && ca2.mode === "roll" && ca2.orientation === "W" && ca2.matchedHeight === 500, "450×5000 → 500폭(W)");

    const nb = calcPricing("부직포배너", 900, 5000, 1);
    console.assert(nb && nb.mode === "area", "non-target water-like stays area");

    const ps = calcPricing("솔벤현수막", 2000, 900, 1), ps2 = calcPricing("솔벤현수막", 2000, 0, 1);
    console.assert(ps && ps.mode === "solvent" && ps.matchedHeight === 900 && ps.supplyTotal === 30000, "solvent 2000×900");
    console.assert(ps2 && ps2.mode === "solvent" && ps2.supplyTotal === 30000, "solvent fixed 900");

    console.assert(clampQty(0) === 1 && clampQty(-5) === 1 && clampQty(MAX_QTY + 5) === MAX_QTY && clampQty("x") === 1, "clampQty");
    const _pw = (s) => { const n = Number(String(s || "").replace(RE_NON_DIGIT, "")); return Number.isFinite(n) ? n : 0; };
    console.assert(_pw("15,000") == 15000 && _pw("abc123") == 123 && _pw("") == 0, "parseWon");

    const per = 50000;
    console.assert(per * 1 === 50000 && per * 3 === 150000, "post-banner totals");

    console.assert(shouldClearSizesOnMaterialChange("게시대현수막", "수성현수막") === true, "clear sizes post→water");
    console.assert(shouldClearSizesOnMaterialChange("수성현수막", "수성현수막") === false, "no clear water→water");
    console.assert(shouldClearSizesOnMaterialChange("수성현수막", "솔벤현수막") === false, "no clear water→solvent");

    console.assert(GROUPS["배너"].includes("현수막배너") && GROUPS["현수막"].includes("수성현수막"), "GROUPS sanity");
  }, []);
  return null;
}

/* ============== Page ============== */
export default function PreviewCanvas() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold">PricingForm Preview</h1>
        <PricingForm />
      </div>
    </div>
  );
}
