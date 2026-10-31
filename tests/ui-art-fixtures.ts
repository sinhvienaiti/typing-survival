import { Journey, objectiveText } from "../src/app/journey";
import { Menu } from "../src/app/menu";
import { stageById } from "../src/content/chapter-1";
import { GUN_SPECS } from "../src/content/guns";
import { renderScreen, type ScreenView } from "../src/view/screens";
import { renderJourney } from "../src/view/screens-journey";

export function journey206(id = "c1-s1"): Journey {
  const j = new Journey({ mode: () => "balanced", store: { getItem: () => null, setItem() {} }, sound() {}, draw() {}, start() {}, back() {} });
  j.brief(stageById(id));
  return j;
}
export function screens206(): Record<string, string> {
  const j = journey206();
  j.open();
  const stages = renderJourney(j);
  j.brief(stageById("c1-s1"));
  const briefing = renderJourney(j);
  j.loadout();
  const loadout1 = renderJourney(j);
  j.brief(stageById("c1-s4")); j.loadout();
  const intro = (stage?: string) => renderScreen({ kind: "intro", title: stage ? "STAGE 1 · FIRST SHIFT" : "TRIAL", lines: [stage ? objectiveText(stageById(stage)) : "Hold the lane for 3 min", "Pulse Gun · Heat Beam"], ready: true, stage, guns: ["xung", "tia"] } as ScreenView);
  return {
    title: renderScreen({ kind: "title", menu: new Menu([]), lead: "Hold the line", status: "Ready" }),
    armory: renderScreen({ kind: "armory", menu: new Menu([{id:"back",label:"Back",enabled:true}]), guns: GUN_SPECS.map(g => ({kind:g.key,name:g.name,title:g.title,text:g.magazine})), learning: [] }),
    stages, briefing, loadout1, loadout4: renderJourney(j), intro: intro("c1-s1"), trial: intro(),
    end: renderScreen({ kind:"end",menu:new Menu([{id:"next",label:"Stage 2",note:"Leader Hunt",enabled:true,art:"stage-c1-s2"} as never]),won:true,stage:"Stage 1 · First Shift",mode:"Balanced",stats:[],words:[],advice:"",note:"" }),
  };
}
/** The text a reader gets: tags dropped, an image that names itself read as its alt. */
export const plain206 = (html: string): string => html.replace(/<img\b[^>]*\balt="([^"]*)"[^>]*>/g, "$1").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
