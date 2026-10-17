const DETECTORS = [
  { regex: /[а-яА-ЯёЁ]/g, locale: "ru-RU" },
  { regex: /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/g, locale: "jp-JP" },
  { regex: /[\uAC00-\uD7AF]/g, locale: "jp-JP" },
  { regex: /[\u0600-\u06FF\u0590-\u05FF]/g, locale: "ar-EG" }
];
function detectMessageLocale(text) {
  const cleaned = text.replace(/[\s\p{P}]/gu, "");
  if (cleaned.length === 0) return null;
  for (const detector of DETECTORS) {
    const matches = cleaned.match(detector.regex);
    if (matches && matches.length >= cleaned.length * 0.4) return detector.locale;
  }
  return null;
}
function isUrl(str) {
  try { let url = new URL(str); return url.protocol ? true : false; }
  catch { return false; }
}
function textOk(text) { if (!text || text.length === 0) return false; if (text.length > 300) return false; return true; }
function localeChain(det, lang, srv) { return det || lang || srv || "en-US"; }
function voiceLeft(oldCh, newCh, ttsVc) { // full TS gate chain pre-memberless
  if (newCh === oldCh) return "same-skip";
  if (oldCh !== ttsVc) return "not-tts-skip";
  return "check-memberless";
}
function enabledGate(data) { if (!data || !data.enabled) return null; return data; }
const R = [];
const t = (name, got, want) => R.push(`${got === want ? "OK  " : "FAIL"} ${name} got=${JSON.stringify(got)} want=${JSON.stringify(want)}`);
// locale detectors
t("ru-basic", detectMessageLocale("привет"), "ru-RU");
t("en-null", detectMessageLocale("hello world"), null);
t("punct-only", detectMessageLocale("!!!"), null);
t("empty", detectMessageLocale(""), null);
t("ru-punct", detectMessageLocale("привет!!!"), "ru-RU");
t("ru-mixed", detectMessageLocale("hello привет"), "ru-RU");
t("thresh-exact40", detectMessageLocale("abcпр"), "ru-RU"); // 2/5 = 0.4
t("thresh-below", detectMessageLocale("abcdпр"), null); // 2/6
t("order-cyr-first", detectMessageLocale("привこんにちは"), "ru-RU"); // 4/9 cyr first
t("hira-majority", detectMessageLocale("abこんにちは"), "jp-JP"); // 2/7 cyr miss, 5/7 hira
t("hangul-quirk", detectMessageLocale("한글한글ab"), "jp-JP");
t("hangul-below", detectMessageLocale("한글 test"), null);
t("arabic", detectMessageLocale("مرحبا"), "ar-EG");
t("hebrew-quirk", detectMessageLocale("שלום"), "ar-EG");
t("astral-cjk", detectMessageLocale("𠀀𠀀𠀀ab"), null);
t("feff-heavy", detectMessageLocale("￾￾￾￾￾￾пр"), "ru-RU");
t("inverted-feff", detectMessageLocale("﻿﻿﻿﻿﻿﻿пр"), "ru-RU");
t("emoji-dilute", detectMessageLocale("😀😀😀😀😀😀😀пр"), null);
t("punct-inverted", detectMessageLocale("¿привет?"), "ru-RU");
t("digits-latin", detectMessageLocale("abc 123"), null);
// isUrl
for (const [n, s, w] of [
  ["url-https", "https://example.com", true], ["url-plain", "notaurl", false],
  ["url-noscheme", "example.com/path", false], ["url-emptyhost", "http://", false],
  ["url-mailto", "mailto:x", true], ["url-space-opaque", "hello: world", null],
  ["url-noslashes", "https:example.com", true], ["url-empty-opaque", "foo:", true],
  ["url-opaque-space", "foo:ba r", null], ["url-short", "a:b", true],
  ["url-badscheme", "1abc:x", false], ["url-scheme-space", "foo bar:baz", false],
  ["url-tel", "tel:+123", true], ["url-upper", "HTTPS://EXAMPLE.COM", true],
  ["url-padded", "\thttps://example.com\n", true], ["url-host-space", "http://ho st/", false],
  ["url-file", "file:///x", true], ["url-file-bare", "file:", true],
  ["url-http-noslash", "http:example.com", true], ["url-ws", "ws://x", true],
  ["url-c1-host", "https://x/", null], ["url-nonspecial-auth", "foo://h/", true],
]) t(n, isUrl(s), w === null ? isUrl(s) : w);
// text gate
t("txt-empty", textOk(""), false);
t("txt-300", textOk("a".repeat(300)), true);
t("txt-301", textOk("a".repeat(301)), false);
t("txt-150astral", textOk("😀".repeat(150)), true);
t("txt-151astral", textOk("😀".repeat(151)), false);
// locale chain (JS || semantics)
t("chain-default", localeChain(null, null, null), "en-US");
t("chain-det", localeChain("ru-RU", "fr-FR", "de-DE"), "ru-RU");
t("chain-empty-det", localeChain("", "fr-FR", null), "fr-FR");
t("chain-space-det", localeChain(" ", null, null), " ");
t("chain-space-lang", localeChain(null, " ", "de-DE"), " ");
// voiceState gates
t("vs-join", voiceLeft(null, "1", "1"), "not-tts-skip");
t("vs-same", voiceLeft("1", "1", "1"), "same-skip");
t("vs-leave-tts", voiceLeft("1", null, "1"), "check-memberless");
t("vs-leave-other", voiceLeft("2", null, "1"), "not-tts-skip");
t("vs-move-away", voiceLeft("1", "2", "1"), "check-memberless");
t("vs-move-in", voiceLeft("2", "1", "1"), "not-tts-skip");
t("vs-bothnull", voiceLeft(null, null, "1"), "same-skip");
// enabled gate
t("en-true", enabledGate({ enabled: true }), { enabled: true });
t("en-false", enabledGate({ enabled: false }), null);
t("en-null", enabledGate(null), null);
t("en-zero", enabledGate({ enabled: 0 }), null);
t("en-strfalse", enabledGate({ enabled: "false" }), { enabled: "false" });
t("en-missing", enabledGate({}), null);
console.log(R.join("\n"));
console.log("FAIL: " + R.filter(l => l.startsWith("FAIL")).length + "/" + R.length);
