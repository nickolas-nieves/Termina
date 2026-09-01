/**
 * Paint the stored theme before the first frame — otherwise a dark-mode user
 * gets a white flash on every load. Runs before React hydrates, which is why
 * it is a raw script and not an effect.
 */
const SCRIPT = `(function(){try{var t=localStorage.getItem("termina.theme.v1");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t;}catch(e){}})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}

export const THEME_KEY = "termina.theme.v1";
export const THEMES = ["system", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];
export const THEME_LABEL: Record<Theme, string> = { system: "System", light: "Light", dark: "Dark" };
export const THEME_CANVAS = { light: "#FBFBFA", dark: "#191918" } as const;
