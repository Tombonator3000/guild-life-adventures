import './game-materials.css';

/** Material-only decoration: it owns no height, controls, text or pointer events. */
export function PanelDecoration() {
  return <div className="panel-decoration" aria-hidden="true" />;
}
