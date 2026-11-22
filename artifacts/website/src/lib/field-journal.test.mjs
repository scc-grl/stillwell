import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const css = read("../index.css");
const surface = css.slice(css.indexOf(".website-theme-surface,"), css.indexOf(".website-theme-surface.dark,"));
const dark = css.slice(css.indexOf(".website-theme-surface.dark,"), css.indexOf("\n.dark {", css.indexOf(".website-theme-surface.dark,")));
const components = read("../components/SiteComponents.tsx");
const theme = read("../components/WebsiteTheme.tsx");

test("Field Journal retains the original light palette while adding the approved new tokens", () => {
  const root = css.slice(css.indexOf(":root {"), css.indexOf(".website-theme-surface,"));
  for (const value of ["--background: 55 25% 95%", "--foreground: 153 21% 20%", "--primary: 154 25% 31%", "--muted-foreground: 137 9% 47%"]) assert.ok(root.includes(value), value);
  for (const [name, light, forest] of [
    ["graphite","#4a5e55","#c9d6c5"],["field","#fffefa","#1b2822"],
    ["choice-border","#e1e5dc","#41534a"],["choice-border-hover","#aebeaa","#85ad96"],
    ["selected-border","#315b49","#88b49a"],["progress-track","#e1e6dc","#41534a"],
    ["progress-fill","#315b49","#88b49a"],["notice","#f5eee5","#3a3128"],
    ["notice-border","#e7d6c7","#856247"],["notice-foreground","#775943","#f2e3d6"],
    ["paper-rule","#e3e8df","#2f3f37"],["tile-sage","#c9d6c5","#35463d"],
    ["tile-clay","#e6d6c8","#3a3128"],["washi","#dfc7b4cc","#856247cc"],
    ["pencil","#bd705c","#d99a86"],["ink-shadow","#1b2822","#0f1814"],
  ]) {
    assert.ok(root.includes(`--${name}: ${light}`), name);
    assert.ok(dark.includes(`--${name}: ${forest}`), `${name} dark`);
    assert.ok(css.includes(`--color-${name}:`), `${name} utility`);
  }
});
test("website fonts, radius, shadows, focus and reduced motion are defined locally", () => {
  for (const name of ["Atkinson Hyperlegible Next","Newsreader","Caveat"]) assert.ok(surface.includes(name));
  assert.match(surface, /--radius:\s*0\.75rem/);
  assert.match(css, /fonts\.googleapis\.com.*display=swap/);
  assert.match(css, /--shadow-paper:\s*0 2px 6px/);
  assert.match(css, /--shadow-ink:\s*0 3px 0/);
  assert.match(css, /outline:\s*3px solid var\(--progress-fill\); outline-offset:\s*3px/);
  assert.match(css, /prefers-reduced-motion:reduce[\s\S]*animation:none!important/);
});
test("the theme defaults to light, persists per account, and has an accessible toggle", () => {
  assert.match(theme, /const \[dark, setDark\] = useState\(false\)/);
  assert.match(theme, /setDark\(saved === "dark"\)/);
  assert.doesNotMatch(theme, /prefers-color-scheme|matchMedia/);
  assert.match(theme, /stillwell\.theme\.user\./);
  assert.match(theme, /localStorage\.setItem/);
  assert.match(theme, /aria-label=\{dark \? "Switch to light mode" : "Switch to dark mode"\}/);
  assert.match(theme, /<span>\{dark \? "Light mode" : "Dark mode"\}<\/span>/);
  assert.match(theme, /if \(!enabled\) return/);
  assert.match(theme, /root\.classList\.toggle\("website-v2", previousScope\)/);
});
test("scale stays controlled when cleared and uses shared rating definitions and shadcn toggles", () => {
  assert.match(components, /import \{ ratingChoices \} from "@workspace\/recovery-journal"/);
  assert.match(components, /value=\{value === null \? "" : String\(value\)\}/);
  assert.match(components, /<ToggleGroup/);
  assert.match(components, /ratingChoices\.find/);
  assert.match(css, /height:\s*3rem/);
  assert.match(css, /noticeability-option\[data-state="on"\]/);
});
test("stage and nondismissible boundary components carry accessible state and notice tokens", () => {
  assert.match(components, /Stage \$\{stage\} of 6/);
  assert.match(components, /role="img" aria-label=\{label\}/);
  assert.match(components, /Pending clinician review/);
  assert.match(components, /Confirmed by your clinician/);
  const notice = components.slice(components.indexOf("export function BoundaryNotice"), components.indexOf("export function PaperNote"));
  assert.match(notice, /<Alert variant="notice"/);
  assert.doesNotMatch(notice, /<button|<Button|onDismiss|onClose/);
});
test("body text palette pairs meet 4.5:1 in light and forest modes", () => {
  const luminance = hex => {
    const [r,g,b] = hex.match(/\w\w/g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);
    return .2126*r+.7152*g+.0722*b;
  };
  for (const [foreground, background] of [["4a5e55","fffefa"],["c9d6c5","24332c"],["775943","f5eee5"],["f2e3d6","3a3128"],["f2f0e9","1b2822"]]) {
    const a=luminance(foreground),b=luminance(background);
    assert.ok((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5, `${foreground} on ${background}`);
  }
});
test("patient journal uses the new scale without introducing marketing paper decorations", () => {
  const journal=read("../components/JournalDatebook.tsx");
  assert.match(journal, /<NoticeabilityScale/);
  assert.doesNotMatch(journal, /<PaperNote|<IllustrationTile|font-hand|paper-note-washi/);
});
