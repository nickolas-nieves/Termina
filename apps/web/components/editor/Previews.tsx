import { Glyph } from "../Glyph";

/** The same glyph at the three sizes it is actually used at, plus inverted. */
export function Previews({ pixels }: { pixels: string }) {
  return (
    <div className="previews">
      <div className="pv">
        <div className="frame"><Glyph pixels={pixels} size={13} /></div>
        <div className="chip">13 px</div>
      </div>
      <div className="pv">
        <div className="frame"><Glyph pixels={pixels} size={26} /></div>
        <div className="chip">26 px</div>
      </div>
      <div className="pv">
        <div className="frame"><Glyph pixels={pixels} size={39} /></div>
        <div className="chip">39 px</div>
      </div>
      <div className="pv-divider" />
      <div className="pv inverse">
        <div className="frame"><Glyph pixels={pixels} size={26} /></div>
        <div className="chip">inverse</div>
      </div>
    </div>
  );
}
