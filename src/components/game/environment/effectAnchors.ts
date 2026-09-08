/** Artwork UVs: deliberately independent of editable hit zones. Original board 5056 × 3392. */
export const CHIMNEYS = [[.098,.760],[.141,.761],[.130,.372],[.928,.243]] as const;
export const LIGHTS = [
  [.108,.854, .024, '#ffac42'], [.876,.318,.012,'#ffc974'], [.895,.328,.010,'#ffc974'],
  [.125,.678,.014,'#ffc974'], [.847,.750,.020,'#93aaff'], [.875,.748,.017,'#ce9dff'],
  [.854,.820,.012,'#b3d897'], [.915,.839,.018,'#95dba6'],
] as const;
// Existing wet ground near the shacks and path junctions. There is no river in this artwork.
export const PUDDLES = [[.498,.135,.022,.006],[.575,.153,.018,.005],[.767,.216,.016,.006],[.166,.867,.023,.008]] as const;
export const FESTIVAL_ANCHORS = [[.283,.090],[.357,.095],[.717,.177],[.833,.261],[.844,.869],[.290,.893]] as const;
export type BoardRect = { top: number; left: number; width: number; height: number };
