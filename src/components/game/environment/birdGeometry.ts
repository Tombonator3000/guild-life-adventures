import { BufferAttribute, InstancedBufferGeometry, SphereGeometry } from 'three';

type Vertex = readonly [number, number, number];
/** A small real mesh: solid body, head, beak, tail and two articulated wing surfaces. */
export function createBirdGeometry() {
  const positions:number[]=[],wings:number[]=[];
  const triangle=(a:Vertex,b:Vertex,c:Vertex,wing=0)=>{
    positions.push(...a,...b,...c);wings.push(wing,wing,wing);
  };
  for(const side of [-1,1]) {
    const root:Vertex=[.14,.10*side,.035],elbow:Vertex=[.02,.53*side,.04];
    const tip:Vertex=[-.28,1.03*side,-.035],back:Vertex=[-.25,.26*side,-.015];
    triangle(root,elbow,back,side);triangle(elbow,tip,back,side);
    triangle(tip,[-.45,.77*side,-.035],back,side);
  }
  triangle([-.24,0,0],[-.57,.15,-.015],[-.52,0,.02]);
  triangle([-.24,0,0],[-.52,0,.02],[-.57,-.15,-.015]);
  for(const [x,y,z,sx,sy,sz] of [[-.03,0,.055,.32,.105,.105],[.285,0,.085,.135,.085,.085]]) {
    const sphere=new SphereGeometry(1,8,5).toNonIndexed();
    const a=sphere.getAttribute('position');
    for(let i=0;i<a.count;i++) {positions.push(x+a.getX(i)*sx,y+a.getY(i)*sy,z+a.getZ(i)*sz);wings.push(0);}
    sphere.dispose();
  }
  triangle([.36,.05,.09],[.54,0,.035],[.36,-.05,.09]);
  triangle([.36,-.05,.09],[.54,0,.035],[.36,0,.15]);
  const geometry=new InstancedBufferGeometry();
  geometry.setAttribute('position',new BufferAttribute(new Float32Array(positions),3));
  geometry.setAttribute('uv',new BufferAttribute(new Float32Array(wings.length*2),2));
  geometry.setAttribute('wing',new BufferAttribute(new Float32Array(wings),1));
  geometry.computeVertexNormals();
  return geometry;
}

export const birdVertex = `
  attribute float wing;
  uniform float flightProgress;
  uniform float flightDirection;
  uniform float flightBand;
  varying vec3 birdNormal;
  void main() {
    // Short flapping bouts alternate with glides. Both wings hinge up/down in Z.
    float glide=smoothstep(.15,.5,sin(time*.72+seed.y*2.0));
    float flap=mix(sin(time*8.5+seed.x*6.28)*.62,.12,glide);
    vec3 p=position,n=normal;
    float a=wing*flap;
    mat2 hinge=mat2(cos(a),sin(a),-sin(a),cos(a));
    if(abs(wing)>.5) {p.yz=hinge*p.yz;n.yz=hinge*n.yz;}
    float bank=sin(flightProgress*6.28+seed.y)*.25;
    mat2 roll=mat2(cos(bank),sin(bank),-sin(bank),cos(bank));p.yz=roll*p.yz;n.yz=roll*n.yz;
    float heading=sin(flightProgress*6.28)*.12;
    mat2 turn=mat2(cos(heading),sin(heading),-sin(heading),cos(heading));
    p.xy=turn*p.xy;n.xy=turn*n.xy;
    p.x*=flightDirection;n.x*=flightDirection;
    float lead=flightDirection>0.0?flightProgress:1.0-flightProgress;
    vec2 origin=vec2(lead*1.38-.19-flightDirection*seed.x*.08,
      flightBand+sin(flightProgress*6.28)*.034+(seed.y-.5)*.06)*board.zw;
    float size=(13.0+seed.z*8.0)*clamp(board.z/1100.0,.65,1.25);
    vec2 projected=vec2(p.x,p.y*.76-p.z*.85)*size;
    place(board.xy+origin+projected);
    gl_Position.z=-p.z*.1;
    birdNormal=n;
  }
`;

export const birdFragment = `
  varying vec3 birdNormal;
  void main() {
    protectUI();
    vec3 n=normalize(birdNormal);
    float light=max(0.0,dot(n,normalize(vec3(-.25,-.6,.8))));
    vec3 feather=mix(vec3(.045,.055,.072),vec3(.24,.29,.32),light);
    gl_FragColor=vec4(feather,1.0);
  }
`;
