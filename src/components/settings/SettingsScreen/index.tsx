import { ComponentProps } from "react";
import { BrandMark } from "../../shared";
import { DataSection } from "./DataSection";
import { PreferenceSections } from "./PreferenceSections";
import "./SettingsScreen.css";

/** The Settings tab: appearance, units, timers, language and data, then About. */
export function SettingsScreen(props: ComponentProps<typeof DataSection>) {
  return (
    <div className="dataScreen">
      <header className="dataHeader">
        <h1 className="dataTitle">Settings</h1>
      </header>

      <PreferenceSections />

      <DataSection {...props} />

      <footer className="settingsAbout">
        <BrandMark className="settingsAbout__mark" />
        <div>
          <p className="settingsAbout__name">GymOS</p>
          <p className="settingsHint">Data stays on this device</p>
        </div>
      </footer>
    </div>
  );
}
